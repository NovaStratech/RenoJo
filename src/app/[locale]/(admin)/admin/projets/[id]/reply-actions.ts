"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { clients, messages, projects } from "@/lib/db/schema";
import { requireAdmin, getCurrentUser } from "@/lib/auth/session";
import { recordAudit } from "@/lib/audit";
import { sendEmail, DEFAULT_FROM } from "@/lib/email/postmark";
import { appOrigin } from "@/lib/email/templates";

const replySchema = z.object({
  projectId: z.string().uuid(),
  body: z.string().trim().min(1).max(20000),
});

export type SendReplyState =
  | { ok: false; error?: string }
  | { ok: true; messageId: string };

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

  // In-platform messaging: store the reply so the client sees it in their
  // portal. We also send a lightweight email notification (from Resend's free
  // shared sender) when the client has message notifications enabled.
  const [inserted] = await db
    .insert(messages)
    .values({
      projectId: project.id,
      direction: "outbound",
      channel: "web",
      senderType: "admin",
      fromEmail: admin?.email ?? null,
      toEmail: client.email,
      bodyText: body,
    })
    .returning({ id: messages.id });

  if (client.notifyOnMessage) {
    const isFr = (client.locale as "fr" | "en") === "fr";
    const portalUrl = `${appOrigin()}/${client.locale}/espace-client/projet/${project.id}`;
    const subject = isFr
      ? `Nouveau message — ${project.title}`
      : `New message — ${project.title}`;
    const textBody = isFr
      ? `Bonjour ${client.fullName},

Vous avez reçu un nouveau message concernant votre projet « ${project.title} ».

Consultez-le dans votre espace client :
${portalUrl}

— RenoJo`
      : `Hi ${client.fullName},

You have a new message about your project "${project.title}".

View it in your client portal:
${portalUrl}

— RenoJo`;
    const htmlBody = `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,sans-serif;max-width:560px;margin:24px auto;padding:0 16px;color:#1a1a1a">
<h2>${isFr ? "Nouveau message" : "New message"}</h2>
<p>${isFr ? "Vous avez reçu un nouveau message concernant votre projet" : "You have a new message about your project"} « ${project.title} ».</p>
<p><a href="${portalUrl}" style="display:inline-block;background:#0a0a0a;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">${isFr ? "Voir le message" : "View message"}</a></p>
</body></html>`;
    try {
      await sendEmail({
        to: client.email,
        from: DEFAULT_FROM,
        subject,
        textBody,
        htmlBody,
      });
    } catch (err) {
      console.error("[sendReply] notification email failed", err);
    }
  }

  revalidatePath(`/${locale}/admin/projets/${project.id}`);
  await recordAudit({
    actorType: "admin",
    actorId: admin?.id,
    action: "message.sent",
    entity: "project",
    entityId: project.id,
    metadata: { messageId: inserted.id, to: client.email },
  });
  return { ok: true, messageId: inserted.id };
}
