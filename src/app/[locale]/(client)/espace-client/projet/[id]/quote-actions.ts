"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers as nextHeaders } from "next/headers";
import { db } from "@/lib/db";
import { messages, projects, quotes } from "@/lib/db/schema";
import { requireClient } from "@/lib/auth/session";
import { recordAudit } from "@/lib/audit";

export type AcceptQuoteResult = { ok: true } | { ok: false; error: string };

const acceptSchema = z.object({
  projectId: z.string().uuid(),
  quoteId: z.string().uuid(),
  signatureName: z.string().trim().min(2).max(200),
  signatureDataUrl: z
    .string()
    .startsWith("data:image/")
    .max(500_000)
    .optional(),
});

/**
 * Accept a quote directly from the authenticated client portal (no magic token
 * needed). Ownership is verified through the logged-in client → project → quote.
 */
export async function acceptQuotePortalAction(
  locale: string,
  _prev: AcceptQuoteResult,
  formData: FormData,
): Promise<AcceptQuoteResult> {
  const { client } = await requireClient(locale);

  const parsed = acceptSchema.safeParse({
    projectId: formData.get("projectId"),
    quoteId: formData.get("quoteId"),
    signatureName: formData.get("signatureName"),
    signatureDataUrl: formData.get("signatureDataUrl") || undefined,
  });
  if (!parsed.success) return { ok: false, error: "invalid" };

  const { projectId, quoteId, signatureName, signatureDataUrl } = parsed.data;

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.clientId, client.id)))
    .limit(1);
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

  await db
    .update(projects)
    .set({ status: "accepted", updatedAt: new Date() })
    .where(eq(projects.id, project.id));

  await db.insert(messages).values({
    projectId: project.id,
    direction: "inbound",
    channel: "system",
    senderType: "system",
    subject: `Quote ${q.number} accepted`,
    bodyText: `Accepted by ${signatureName}`,
  });

  await recordAudit({
    actorType: "client",
    actorId: client.id,
    action: "quote.accepted",
    entity: "quote",
    entityId: quoteId,
    metadata: { signatureName, ip, via: "portal" },
  });

  revalidatePath(`/${locale}/espace-client/projet/${project.id}`);
  return { ok: true };
}

export async function declineQuotePortalAction(
  locale: string,
  projectId: string,
  quoteId: string,
) {
  const { client } = await requireClient(locale);

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.clientId, client.id)))
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

  await recordAudit({
    actorType: "client",
    actorId: client.id,
    action: "quote.declined",
    entity: "quote",
    entityId: quoteId,
    metadata: { via: "portal" },
  });

  revalidatePath(`/${locale}/espace-client/projet/${project.id}`);
}
