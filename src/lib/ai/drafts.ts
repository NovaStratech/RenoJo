import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  aiDrafts,
  catalogItems,
  clients,
  messages,
  projectPhotos,
  projects,
} from "@/lib/db/schema";
import { BUCKETS, createSignedUrl } from "@/lib/storage";
import { getOpenAI, getTextModel, getVisionModel } from "./client";

export type AIResult<T> =
  | { ok: true; data: T; cached?: boolean }
  | { ok: false; error: string };

async function loadProjectContext(projectId: string) {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!project) return null;
  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, project.clientId))
    .limit(1);
  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.projectId, projectId))
    .orderBy(asc(messages.createdAt));
  return { project, client, messages: msgs };
}

function messagesToTranscript(msgs: typeof messages.$inferSelect[]) {
  return msgs
    .filter((m) => m.bodyText)
    .map((m) => {
      const who =
        m.direction === "inbound"
          ? "CLIENT"
          : m.senderType === "system"
            ? "SYSTEM"
            : "ADMIN";
      return `[${who}] ${m.subject ? `(${m.subject}) ` : ""}${m.bodyText}`;
    })
    .join("\n\n");
}

/* =========================================================================
 * Draft reply
 * ========================================================================= */

export async function draftReplyForProject(
  projectId: string,
  locale: "fr" | "en" = "fr",
): Promise<AIResult<string>> {
  const ai = getOpenAI();
  if (!ai) return { ok: false, error: "openai_not_configured" };

  const ctx = await loadProjectContext(projectId);
  if (!ctx) return { ok: false, error: "project_not_found" };

  const transcript = messagesToTranscript(ctx.messages);
  const system =
    locale === "fr"
      ? `Tu es l'assistant de Joe, entrepreneur en rénovation au Québec.
Tu rédiges des courriels courts, polis et professionnels, en français québécois neutre.
Ton: chaleureux mais direct. Pas de jargon. Pas d'emojis.
N'invente pas de prix ni de dates. Si une info manque, propose une question claire.`
      : `You are Joe's assistant — a Quebec renovation contractor.
Write short, polite, professional emails in clear English.
Tone: warm but direct. No jargon. No emojis.
Never invent prices or dates. If info is missing, ask one clear question.`;

  const user = `Projet : ${ctx.project.title}
Type : ${ctx.project.projectType ?? "?"} · Urgence : ${ctx.project.urgency ?? "?"}
Client : ${ctx.client?.fullName ?? "?"} <${ctx.client?.email ?? "?"}>

Description initiale :
${ctx.project.description ?? "(aucune)"}

Historique des échanges :
${transcript || "(aucun message)"}

Rédige uniquement le corps du courriel de réponse, sans objet ni signature.`;

  const completion = await ai.chat.completions.create({
    model: getTextModel(),
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.4,
    max_tokens: 600,
  });
  const text = completion.choices[0]?.message?.content?.trim() ?? "";
  if (!text) return { ok: false, error: "empty_response" };

  await db.insert(aiDrafts).values({
    projectId,
    kind: "reply",
    content: { text },
    model: completion.model,
  });

  return { ok: true, data: text };
}

/* =========================================================================
 * Summarize project
 * ========================================================================= */

export async function summarizeProject(
  projectId: string,
  locale: "fr" | "en" = "fr",
): Promise<AIResult<string>> {
  const ai = getOpenAI();
  if (!ai) return { ok: false, error: "openai_not_configured" };

  // Cache: return latest summary if generated within last 24h and no new messages since
  const recent = await db
    .select()
    .from(aiDrafts)
    .where(eq(aiDrafts.projectId, projectId))
    .orderBy(desc(aiDrafts.createdAt))
    .limit(20);
  const latestSummary = recent.find((r) => r.kind === "project_summary");

  const ctx = await loadProjectContext(projectId);
  if (!ctx) return { ok: false, error: "project_not_found" };

  if (latestSummary) {
    const lastMsg = ctx.messages.at(-1);
    const sameOrNewer =
      !lastMsg ||
      new Date(latestSummary.createdAt).getTime() >=
        new Date(lastMsg.createdAt).getTime();
    if (sameOrNewer) {
      const data = (latestSummary.content as { text?: string }).text ?? "";
      if (data) return { ok: true, data, cached: true };
    }
  }

  const transcript = messagesToTranscript(ctx.messages);

  const system =
    locale === "fr"
      ? "Tu produis des résumés très courts (5-7 puces) pour aider un entrepreneur en rénovation à reprendre rapidement un dossier client. Pas d'emojis."
      : "Produce very short bullet summaries (5-7 bullets) to help a renovation contractor get back up to speed on a client file. No emojis.";

  const user = `Projet : ${ctx.project.title}
Statut : ${ctx.project.status}
Description : ${ctx.project.description ?? "(aucune)"}

Historique :
${transcript || "(aucun message)"}

Résume en 5 à 7 puces : contexte, demandes du client, actions effectuées, blocages, prochaines étapes.`;

  const completion = await ai.chat.completions.create({
    model: getTextModel(),
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.2,
    max_tokens: 500,
  });
  const text = completion.choices[0]?.message?.content?.trim() ?? "";
  if (!text) return { ok: false, error: "empty_response" };

  await db.insert(aiDrafts).values({
    projectId,
    kind: "project_summary",
    content: { text },
    model: completion.model,
  });

  return { ok: true, data: text };
}

/* =========================================================================
 * Suggest quote lines from photos (vision)
 * ========================================================================= */

export type SuggestedLine = {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxable: boolean;
};

export async function suggestQuoteLines(
  projectId: string,
  locale: "fr" | "en" = "fr",
): Promise<AIResult<SuggestedLine[]>> {
  const ai = getOpenAI();
  if (!ai) return { ok: false, error: "openai_not_configured" };

  const ctx = await loadProjectContext(projectId);
  if (!ctx) return { ok: false, error: "project_not_found" };

  const photos = await db
    .select()
    .from(projectPhotos)
    .where(eq(projectPhotos.projectId, projectId))
    .limit(6);
  const photoUrls: string[] = [];
  for (const p of photos) {
    const url = await createSignedUrl(BUCKETS.projectPhotos, p.storagePath, 3600);
    if (url) photoUrls.push(url);
  }

  const catalog = await db
    .select({
      name: catalogItems.name,
      unit: catalogItems.unit,
      unitPrice: catalogItems.unitPrice,
      taxable: catalogItems.taxable,
    })
    .from(catalogItems)
    .where(eq(catalogItems.active, true))
    .limit(50);

  const catalogText = catalog
    .map((c) => `- ${c.name} (${c.unit}, ${c.unitPrice} CAD, taxable=${c.taxable})`)
    .join("\n");

  const system =
    locale === "fr"
      ? `Tu aides un entrepreneur en rénovation à pré-remplir un devis à partir des photos et de la description du projet.
Renvoie uniquement du JSON valide selon ce schéma:
{"lines":[{"description":string,"quantity":number,"unit":string,"unitPrice":number,"taxable":boolean}]}
- 3 à 8 lignes max.
- Sois conservateur sur les prix (utilise le catalogue fourni quand pertinent).
- Si tu n'es pas sûr d'un prix, mets unitPrice à 0 et indique-le dans la description.`
      : `You help a renovation contractor pre-fill a quote from photos and the project description.
Return ONLY valid JSON matching:
{"lines":[{"description":string,"quantity":number,"unit":string,"unitPrice":number,"taxable":boolean}]}
- 3 to 8 lines max.
- Be conservative with prices (use the provided catalog when relevant).
- If unsure of a price, set unitPrice to 0 and say so in the description.`;

  const userText = `Projet : ${ctx.project.title}
Type : ${ctx.project.projectType ?? "?"}
Description : ${ctx.project.description ?? "(aucune)"}

Catalogue d'articles disponibles :
${catalogText || "(vide)"}`;

  type ImagePart = { type: "image_url"; image_url: { url: string } };
  type TextPart = { type: "text"; text: string };
  const userContent: (TextPart | ImagePart)[] = [
    { type: "text", text: userText },
    ...photoUrls.map<ImagePart>((u) => ({ type: "image_url", image_url: { url: u } })),
  ];

  const completion = await ai.chat.completions.create({
    model: photoUrls.length > 0 ? getVisionModel() : getTextModel(),
    messages: [
      { role: "system", content: system },
      // openai sdk typings accept the content array
      { role: "user", content: userContent as never },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
    max_tokens: 900,
  });

  const raw = completion.choices[0]?.message?.content ?? "";
  let parsed: { lines?: SuggestedLine[] } = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "bad_json" };
  }
  const lines = (parsed.lines ?? [])
    .map((l) => ({
      description: String(l.description ?? "").slice(0, 1000),
      quantity: Number(l.quantity) || 1,
      unit: String(l.unit ?? "unit").slice(0, 30),
      unitPrice: Number(l.unitPrice) || 0,
      taxable: l.taxable !== false,
    }))
    .filter((l) => l.description.length > 0)
    .slice(0, 12);

  await db.insert(aiDrafts).values({
    projectId,
    kind: "quote_prefill",
    content: { lines },
    model: completion.model,
  });

  return { ok: true, data: lines };
}

// ---------------------------------------------------------------------------
// Revise free-form text (notes, terms, reply body) — corrige fautes,
// améliore la formulation, conserve l'intention de l'auteur.
// ---------------------------------------------------------------------------

export type ReviseKind = "notes" | "terms" | "reply";

function revisePrompts(locale: "fr" | "en", kind: ReviseKind) {
  if (locale === "fr") {
    const base =
      "Tu es un assistant qui révise du texte écrit par un entrepreneur en rénovation. Corrige les fautes d'orthographe, de grammaire et de ponctuation. Améliore la formulation pour qu'elle soit claire et professionnelle, MAIS conserve strictement l'intention et le sens de l'auteur. N'ajoute pas d'information nouvelle. Garde la même langue (français). Réponds UNIQUEMENT avec le texte révisé, sans explication, sans guillemets, sans préambule.";
    const flavour =
      kind === "terms"
        ? " Rends le ton plus formel, adapté à des conditions de devis."
        : kind === "reply"
          ? " Garde un ton courtois et chaleureux, adapté à un échange par courriel avec un client."
          : " Garde un ton informatif et neutre, adapté à des notes de devis.";
    return base + flavour;
  }
  const base =
    "You revise text written by a renovation contractor. Fix spelling, grammar and punctuation. Improve clarity and professionalism BUT strictly preserve the author's intent and meaning. Do not add new information. Keep the same language (English). Reply ONLY with the revised text — no explanation, no quotes, no preamble.";
  const flavour =
    kind === "terms"
      ? " Use a more formal tone suitable for quote terms and conditions."
      : kind === "reply"
        ? " Keep a polite and warm tone suitable for an email to a client."
        : " Keep an informative, neutral tone suitable for quote notes.";
  return base + flavour;
}

export async function reviseText(
  text: string,
  locale: "fr" | "en" = "fr",
  kind: ReviseKind = "notes",
): Promise<AIResult<string>> {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return { ok: false, error: "empty_text" };
  if (trimmed.length > 8000) return { ok: false, error: "text_too_long" };

  const ai = getOpenAI();
  if (!ai) return { ok: false, error: "openai_not_configured" };

  try {
    const completion = await ai.chat.completions.create({
      model: getTextModel(),
      messages: [
        { role: "system", content: revisePrompts(locale, kind) },
        { role: "user", content: trimmed },
      ],
      temperature: 0.3,
      max_tokens: 1200,
    });
    const revised = (completion.choices[0]?.message?.content ?? "").trim();
    if (!revised) return { ok: false, error: "empty_response" };
    return { ok: true, data: revised };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ai_error" };
  }
}
