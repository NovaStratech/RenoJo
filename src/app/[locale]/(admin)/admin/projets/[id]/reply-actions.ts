"use server";

import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { clients, messages, projects } from "@/lib/db/schema";
import { requireAdmin, getCurrentUser } from "@/lib/auth/session";
import { buildReplyToAddress, sendEmail } from "@/lib/email/postmark";
import { adminReplyEmail, appOrigin } from "@/lib/email/templates";
import { recordAudit } from "@/lib/audit";

const replySchema = z.object({
  projectId: z.string().uuid(),
  body: z.string().trim().min(1).max(20000),
});

export type SendReplyState =
  | { ok: false; error?: string }
  | { ok: true; messageId: string; skipped?: boolean };

export async function sendReplyAction(
  locale: string,
  _prev: SendReplyState,
  formData: FormData,
): Promise<SendReplyState> {
  await requireAdmin(locale);
  const admin = await getCurrentUser();

  const parsed = replySchema.safeParse({
    projectId: formData.get("projectId"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { ok: false, error: "invalid" };
  }
  const { projectId, body } = parsed.data;

  const projectRows = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  const project = projectRows[0];
  if (!project) return { ok: false, error: "not_found" };

  const clientRows = await db
    .select()
    .from(clients)
    .where(eq(clients.id, project.clientId))
    .limit(1);
  const client = clientRows[0];
  if (!client) return { ok: false, error: "no_client" };

  // Find last inbound from this project for threading headers
  const lastInbound = await db
    .select()
    .from(messages)
    .where(eq(messages.projectId, project.id))
    .orderBy(desc(messages.createdAt))
    .limit(10);

  const lastInboundWithId = lastInbound.find(
    (m) => m.direction === "inbound" && m.postmarkMessageId,
  );

  const accessUrl = `${appOrigin()}/${client.locale ?? locale}/projet/<token>`; // token not exposed server-side; client uses the link in the original confirmation email
  const tpl = adminReplyEmail({
    locale: (client.locale as "fr" | "en" | undefined) ?? "fr",
    clientName: client.fullName,
    projectTitle: project.title,
    bodyText: body,
    accessUrl,
  });

  const replyTo = buildReplyToAddress(project.inboundKey);

  const headers: Record<string, string> = {};
  if (lastInboundWithId?.postmarkMessageId) {
    headers["In-Reply-To"] = `<${lastInboundWithId.postmarkMessageId}>`;
    const refs = lastInboundWithId.referencesHeader
      ? `${lastInboundWithId.referencesHeader} <${lastInboundWithId.postmarkMessageId}>`
      : `<${lastInboundWithId.postmarkMessageId}>`;
    headers["References"] = refs;
  }

  const sent = await sendEmail({
    to: client.email,
    subject: tpl.subject,
    textBody: tpl.text,
    htmlBody: tpl.html,
    replyTo: replyTo ?? undefined,
    headers: Object.keys(headers).length ? headers : undefined,
  });

  const [inserted] = await db
    .insert(messages)
    .values({
      projectId: project.id,
      direction: "outbound",
      channel: "email",
      senderType: "admin",
      fromEmail: admin?.email ?? null,
      toEmail: client.email,
      subject: tpl.subject,
      bodyText: body,
      bodyHtml: tpl.html,
      postmarkMessageId: sent.ok && !("skipped" in sent && sent.skipped) ? sent.messageId : null,
      inReplyTo: headers["In-Reply-To"] ?? null,
      referencesHeader: headers["References"] ?? null,
    })
    .returning({ id: messages.id });

  revalidatePath(`/${locale}/admin/projets/${project.id}`);
  await recordAudit({
    actorType: "admin",
    actorId: admin?.id,
    action: "message.sent",
    entity: "project",
    entityId: project.id,
    metadata: { messageId: inserted.id, to: client.email },
  });
  return { ok: true, messageId: inserted.id, skipped: "skipped" in sent && sent.skipped };
}
