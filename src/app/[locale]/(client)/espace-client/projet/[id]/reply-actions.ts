"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { messages, projects } from "@/lib/db/schema";
import { requireClient } from "@/lib/auth/session";

const replySchema = z.object({
  projectId: z.string().uuid(),
  body: z.string().trim().min(1).max(20000),
});

export type ClientReplyState =
  | { ok: false; error?: string }
  | { ok: true; messageId: string };

export async function sendClientReplyAction(
  locale: string,
  _prev: ClientReplyState,
  formData: FormData,
): Promise<ClientReplyState> {
  const { user, client } = await requireClient(locale);

  const parsed = replySchema.safeParse({
    projectId: formData.get("projectId"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { ok: false, error: "invalid" };
  }
  const { projectId, body } = parsed.data;

  // Ownership check
  const rows = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.clientId, client.id)))
    .limit(1);
  const project = rows[0];
  if (!project) return { ok: false, error: "not_found" };

  const [inserted] = await db
    .insert(messages)
    .values({
      projectId: project.id,
      direction: "inbound",
      channel: "web",
      senderType: "client",
      fromEmail: user.email ?? client.email,
      bodyText: body,
    })
    .returning({ id: messages.id });

  revalidatePath(`/${locale}/espace-client/projet/${project.id}`);
  return { ok: true, messageId: inserted.id };
}
