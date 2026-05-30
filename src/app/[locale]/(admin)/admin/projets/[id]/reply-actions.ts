"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { clients, messages, projects } from "@/lib/db/schema";
import { requireAdmin, getCurrentUser } from "@/lib/auth/session";
import { recordAudit } from "@/lib/audit";

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
  // portal. No email is sent (notifications are handled in the dashboard).
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
