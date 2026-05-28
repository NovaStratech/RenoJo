"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers as nextHeaders } from "next/headers";
import { and, asc, eq } from "drizzle-orm";import { db } from "@/lib/db";
import {
  clients,
  companySettings,
  messages,
  projects,
  quoteLines,
  quotes,
  invoices,
} from "@/lib/db/schema";
import { requireAdmin, getCurrentUser } from "@/lib/auth/session";
import { generateAccessToken, hashToken } from "@/lib/auth/tokens";
import {
  computeLineTotal,
  computeQuoteTotals,
  type LineInput,
} from "@/lib/quotes/totals";
import {
  getCompanyTaxRates,
  nextInvoiceNumber,
  nextQuoteNumber,
} from "@/lib/quotes/queries";
import { BUCKETS, createSignedUrl, uploadToBucket } from "@/lib/storage";
import { renderQuotePdf } from "@/lib/pdf/render-quote";
import { buildReplyToAddress, sendEmail } from "@/lib/email/postmark";
import { appOrigin } from "@/lib/email/templates";

const lineSchema = z.object({
  description: z.string().trim().min(1).max(2000),
  quantity: z.coerce.number().min(0),
  unit: z.string().trim().min(1).max(30),
  unitPrice: z.coerce.number().min(0),
  taxable: z.coerce.boolean(),
});

const quoteInputSchema = z.object({
  projectId: z.string().uuid(),
  notes: z.string().trim().max(4000).optional().nullable(),
  terms: z.string().trim().max(4000).optional().nullable(),
  validUntil: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v ? new Date(v) : null)),
  lines: z.array(lineSchema).min(1).max(100),
});

function parseQuoteForm(formData: FormData) {
  const linesRaw = formData.get("lines");
  let lines: unknown = [];
  if (typeof linesRaw === "string") {
    try {
      lines = JSON.parse(linesRaw);
    } catch {
      lines = [];
    }
  }
  return quoteInputSchema.parse({
    projectId: formData.get("projectId"),
    notes: formData.get("notes")?.toString() || null,
    terms: formData.get("terms")?.toString() || null,
    validUntil: formData.get("validUntil")?.toString() || null,
    lines,
  });
}

export async function createQuoteDraft(locale: string, formData: FormData) {
  await requireAdmin(locale);
  const data = parseQuoteForm(formData);

  const rates = await getCompanyTaxRates();
  const totals = computeQuoteTotals(data.lines as LineInput[], rates);
  const number = await nextQuoteNumber();

  const [created] = await db
    .insert(quotes)
    .values({
      projectId: data.projectId,
      number,
      status: "draft",
      subtotal: String(totals.subtotal),
      gst: String(totals.gst),
      qst: String(totals.qst),
      total: String(totals.total),
      notes: data.notes ?? null,
      terms: data.terms ?? null,
      validUntil: data.validUntil ?? null,
    })
    .returning({ id: quotes.id });

  await db.insert(quoteLines).values(
    data.lines.map((l, i) => ({
      quoteId: created.id,
      sortOrder: i,
      description: l.description,
      quantity: String(l.quantity),
      unit: l.unit,
      unitPrice: String(l.unitPrice),
      taxable: l.taxable,
      lineTotal: String(computeLineTotal(l as LineInput)),
    })),
  );

  revalidatePath(`/${locale}/admin/projets/${data.projectId}`);
  redirect(`/${locale}/admin/projets/${data.projectId}/devis/${created.id}`);
}

export async function updateQuoteDraft(
  locale: string,
  quoteId: string,
  formData: FormData,
) {
  await requireAdmin(locale);
  const data = parseQuoteForm(formData);

  const existing = await db
    .select()
    .from(quotes)
    .where(eq(quotes.id, quoteId))
    .limit(1);
  if (!existing[0]) throw new Error("not_found");
  if (existing[0].status !== "draft") {
    throw new Error("quote_not_draft");
  }

  const rates = await getCompanyTaxRates();
  const totals = computeQuoteTotals(data.lines as LineInput[], rates);

  await db
    .update(quotes)
    .set({
      subtotal: String(totals.subtotal),
      gst: String(totals.gst),
      qst: String(totals.qst),
      total: String(totals.total),
      notes: data.notes ?? null,
      terms: data.terms ?? null,
      validUntil: data.validUntil ?? null,
      updatedAt: new Date(),
    })
    .where(eq(quotes.id, quoteId));

  await db.delete(quoteLines).where(eq(quoteLines.quoteId, quoteId));
  await db.insert(quoteLines).values(
    data.lines.map((l, i) => ({
      quoteId,
      sortOrder: i,
      description: l.description,
      quantity: String(l.quantity),
      unit: l.unit,
      unitPrice: String(l.unitPrice),
      taxable: l.taxable,
      lineTotal: String(computeLineTotal(l as LineInput)),
    })),
  );

  revalidatePath(`/${locale}/admin/projets/${data.projectId}/devis/${quoteId}`);
  revalidatePath(`/${locale}/admin/projets/${data.projectId}`);
}

export async function deleteQuote(
  locale: string,
  projectId: string,
  quoteId: string,
) {
  await requireAdmin(locale);
  await db.delete(quotes).where(eq(quotes.id, quoteId));
  revalidatePath(`/${locale}/admin/projets/${projectId}`);
  redirect(`/${locale}/admin/projets/${projectId}`);
}

export async function sendQuote(
  locale: string,
  projectId: string,
  quoteId: string,
) {
  await requireAdmin(locale);

  const [qRow] = await db.select().from(quotes).where(eq(quotes.id, quoteId)).limit(1);
  if (!qRow) throw new Error("quote_not_found");

  const lines = await db
    .select()
    .from(quoteLines)
    .where(eq(quoteLines.quoteId, quoteId))
    .orderBy(asc(quoteLines.sortOrder));
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) throw new Error("project_not_found");
  const [client] = await db.select().from(clients).where(eq(clients.id, project.clientId)).limit(1);
  if (!client) throw new Error("client_not_found");
  const [company] = await db
    .select()
    .from(companySettings)
    .where(eq(companySettings.id, 1))
    .limit(1);
  if (!company) throw new Error("company_not_set");

  const clientLocale = (client.locale as "fr" | "en") ?? "fr";

  // Rotate the client access token so the email contains a fresh working link.
  // The previous token becomes invalid (acceptable for v1).
  const { token: clientAccessToken, hash: newTokenHash } = generateAccessToken();
  await db
    .update(projects)
    .set({ accessTokenHash: newTokenHash, updatedAt: new Date() })
    .where(eq(projects.id, project.id));

  const totals = {
    subtotal: Number(qRow.subtotal),
    taxableBase: 0,
    gst: Number(qRow.gst),
    qst: Number(qRow.qst),
    total: Number(qRow.total),
  };

  // Render PDF
  const pdfBuffer = await renderQuotePdf({
    locale: clientLocale,
    company: {
      businessName: company.businessName,
      legalName: company.legalName,
      addressLine: company.addressLine,
      city: company.city,
      province: company.province,
      postalCode: company.postalCode,
      phone: company.phone,
      email: company.email,
      gstNumber: company.gstNumber,
      qstNumber: company.qstNumber,
    },
    client: {
      fullName: client.fullName,
      email: client.email,
      phone: client.phone,
      addressLine: project.addressLine,
      city: project.city,
      province: project.province,
      postalCode: project.postalCode,
    },
    quote: {
      number: qRow.number,
      issuedAt: new Date(),
      validUntil: qRow.validUntil,
      notes: qRow.notes,
      terms: qRow.terms,
      currency: qRow.currency,
    },
    lines: lines.map((l) => ({
      description: l.description,
      quantity: l.quantity,
      unit: l.unit,
      unitPrice: l.unitPrice,
      lineTotal: l.lineTotal,
      taxable: l.taxable,
    })),
    totals,
  });

  // Use upsert via service client: simplest path = delete then upload, or use service via storage helper
  // We'll just upload with random filename to avoid collisions
  const path = `${project.id}/${qRow.id}-${Date.now()}.pdf`;
  await uploadToBucket(BUCKETS.quotePdfs, path, pdfBuffer, "application/pdf");

  // Client URL with magic token
  const acceptUrl = `${appOrigin()}/${clientLocale}/projet/${clientAccessToken}/devis/${quoteId}`;
  const pdfSignedUrl = await createSignedUrl(BUCKETS.quotePdfs, path, 7 * 24 * 3600);

  // Build email
  const isFr = clientLocale === "fr";
  const subject = isFr
    ? `Votre devis ${qRow.number} — ${project.title}`
    : `Your quote ${qRow.number} — ${project.title}`;
  const textBody = isFr
    ? `Bonjour ${client.fullName},

Veuillez trouver ci-joint votre devis ${qRow.number} pour le projet "${project.title}".
Total : ${qRow.total} ${qRow.currency} (taxes incluses).

Pour consulter et accepter le devis en ligne :
${acceptUrl}

Merci,
${company.businessName}`
    : `Hi ${client.fullName},

Please find attached your quote ${qRow.number} for project "${project.title}".
Total: ${qRow.total} ${qRow.currency} (taxes included).

View and accept the quote online:
${acceptUrl}

Thanks,
${company.businessName}`;

  const htmlBody = `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,sans-serif;max-width:560px;margin:24px auto;padding:0 16px;color:#1a1a1a">
<h2>${isFr ? "Votre devis" : "Your quote"} ${qRow.number}</h2>
<p>${isFr ? "Total" : "Total"} : <strong>${qRow.total} ${qRow.currency}</strong></p>
<p><a href="${acceptUrl}" style="display:inline-block;background:#0a0a0a;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">${isFr ? "Voir et accepter le devis" : "View and accept quote"}</a></p>
${pdfSignedUrl ? `<p style="font-size:12px;color:#777">${isFr ? "Téléchargement direct" : "Direct download"}: <a href="${pdfSignedUrl}">${qRow.number}.pdf</a></p>` : ""}
</body></html>`;

  const replyTo = buildReplyToAddress(project.inboundKey) ?? undefined;
  const sent = await sendEmail({
    to: client.email,
    subject,
    textBody,
    htmlBody,
    replyTo,
    attachments: [
      {
        Name: `${qRow.number}.pdf`,
        Content: pdfBuffer.toString("base64"),
        ContentType: "application/pdf",
      },
    ],
  });

  const admin = await getCurrentUser();
  // Persist outbound message
  await db.insert(messages).values({
    projectId: project.id,
    direction: "outbound",
    channel: "email",
    senderType: "admin",
    fromEmail: admin?.email ?? null,
    toEmail: client.email,
    subject,
    bodyText: textBody,
    bodyHtml: htmlBody,
    postmarkMessageId: sent.ok && !("skipped" in sent && sent.skipped) ? sent.messageId : null,
  });

  await db
    .update(quotes)
    .set({
      status: "sent",
      sentAt: new Date(),
      pdfStoragePath: path,
      updatedAt: new Date(),
    })
    .where(eq(quotes.id, quoteId));

  // Bump project to "quoted" if still new/in_review
  if (project.status === "new" || project.status === "in_review") {
    await db
      .update(projects)
      .set({ status: "quoted", updatedAt: new Date() })
      .where(eq(projects.id, project.id));
  }

  revalidatePath(`/${locale}/admin/projets/${project.id}`);
  revalidatePath(`/${locale}/admin/projets/${project.id}/devis/${quoteId}`);
  return { ok: true, pdfPath: path };
}

/* =========================================================================
 * Client acceptance
 * ========================================================================= */

const acceptSchema = z.object({
  token: z.string().min(8),
  quoteId: z.string().uuid(),
  signatureName: z.string().trim().min(2).max(200),
  signatureDataUrl: z.string().startsWith("data:image/").max(500_000).optional(),
});

export type AcceptQuoteResult =
  | { ok: true }
  | { ok: false; error: string };

export async function acceptQuoteAction(
  locale: string,
  _prev: AcceptQuoteResult,
  formData: FormData,
): Promise<AcceptQuoteResult> {
  const parsed = acceptSchema.safeParse({
    token: formData.get("token"),
    quoteId: formData.get("quoteId"),
    signatureName: formData.get("signatureName"),
    signatureDataUrl: formData.get("signatureDataUrl") || undefined,
  });
  if (!parsed.success) return { ok: false, error: "invalid" };

  const { token, quoteId, signatureName, signatureDataUrl } = parsed.data;
  const tokenHash = hashToken(token);

  // Verify ownership via token → project → quote
  const projRows = await db
    .select()
    .from(projects)
    .where(eq(projects.accessTokenHash, tokenHash))
    .limit(1);
  const project = projRows[0];
  if (!project) return { ok: false, error: "not_found" };

  const [q] = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.id, quoteId), eq(quotes.projectId, project.id)))
    .limit(1);
  if (!q) return { ok: false, error: "quote_not_found" };
  if (q.status === "accepted") return { ok: true };
  if (q.status !== "sent" && q.status !== "viewed") {
    return { ok: false, error: "not_acceptable" };
  }

  const hdr = await nextHeaders();
  const ip =
    hdr.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    hdr.get("x-real-ip") ??
    null;

  await db
    .update(quotes)
    .set({
      status: "accepted",
      acceptedAt: new Date(),
      signatureName,
      signatureDataUrl: signatureDataUrl ?? null,
      signatureIp: ip,
      updatedAt: new Date(),
    })
    .where(eq(quotes.id, quoteId));

  // Bump project status
  await db
    .update(projects)
    .set({ status: "accepted", updatedAt: new Date() })
    .where(eq(projects.id, project.id));

  // Add system message
  await db.insert(messages).values({
    projectId: project.id,
    direction: "inbound",
    channel: "system",
    senderType: "system",
    subject: `Quote ${q.number} accepted`,
    bodyText: `Accepted by ${signatureName}`,
  });

  revalidatePath(`/${locale}/projet/${token}`);
  revalidatePath(`/${locale}/projet/${token}/devis/${quoteId}`);
  return { ok: true };
}

export async function declineQuoteAction(
  locale: string,
  token: string,
  quoteId: string,
) {
  const tokenHash = hashToken(token);
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.accessTokenHash, tokenHash))
    .limit(1);
  if (!project) return;
  const [q] = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.id, quoteId), eq(quotes.projectId, project.id)))
    .limit(1);
  if (!q) return;
  if (q.status === "accepted" || q.status === "declined") return;

  await db
    .update(quotes)
    .set({ status: "declined", declinedAt: new Date(), updatedAt: new Date() })
    .where(eq(quotes.id, quoteId));
  await db.insert(messages).values({
    projectId: project.id,
    direction: "inbound",
    channel: "system",
    senderType: "system",
    subject: `Quote ${q.number} declined`,
    bodyText: null,
  });
  revalidatePath(`/${locale}/projet/${token}/devis/${quoteId}`);
}

export async function convertQuoteToInvoice(
  locale: string,
  projectId: string,
  quoteId: string,
) {
  await requireAdmin(locale);
  const [q] = await db.select().from(quotes).where(eq(quotes.id, quoteId)).limit(1);
  if (!q) throw new Error("quote_not_found");
  if (q.status !== "accepted") throw new Error("quote_not_accepted");

  const number = await nextInvoiceNumber();
  await db.insert(invoices).values({
    projectId,
    quoteId,
    number,
    status: "draft",
    subtotal: q.subtotal,
    gst: q.gst,
    qst: q.qst,
    total: q.total,
    currency: q.currency,
  });
  revalidatePath(`/${locale}/admin/projets/${projectId}`);
}
