import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects, clients, projectPhotos, messages } from "@/lib/db/schema";
import { hashToken } from "@/lib/auth/tokens";

/** Look up a project by its plaintext client access token. Returns null if not found. */
export async function getProjectByToken(token: string) {
  if (!token || typeof token !== "string") return null;
  const hash = hashToken(token);
  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.accessTokenHash, hash))
    .limit(1);
  return rows[0] ?? null;
}

/** Get full client + project + photos + messages for the client portal. */
export async function getProjectFullByToken(token: string) {
  const project = await getProjectByToken(token);
  if (!project) return null;

  const [client, photos, projectMessages] = await Promise.all([
    db.select().from(clients).where(eq(clients.id, project.clientId)).limit(1),
    db.select().from(projectPhotos).where(eq(projectPhotos.projectId, project.id)),
    db.select().from(messages).where(eq(messages.projectId, project.id)),
  ]);

  return {
    project,
    client: client[0] ?? null,
    photos,
    messages: projectMessages.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    ),
  };
}
