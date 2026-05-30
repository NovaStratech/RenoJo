import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  clients,
  messages,
  projects,
  projectPhotos,
  quotes,
  quoteLines,
} from "@/lib/db/schema";

/** List all projects belonging to a client, newest first. */
export async function listProjectsForClient(clientId: string) {
  return db
    .select()
    .from(projects)
    .where(eq(projects.clientId, clientId))
    .orderBy(desc(projects.createdAt));
}

/**
 * Get full project detail for a client, enforcing ownership.
 * Returns null if the project does not exist or is not owned by the client.
 */
export async function getClientProjectDetail(
  projectId: string,
  clientId: string,
) {
  const rows = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.clientId, clientId)))
    .limit(1);
  const project = rows[0];
  if (!project) return null;

  const [clientRow, photos, msgs, qts] = await Promise.all([
    db.select().from(clients).where(eq(clients.id, clientId)).limit(1),
    db.select().from(projectPhotos).where(eq(projectPhotos.projectId, project.id)),
    db
      .select()
      .from(messages)
      .where(eq(messages.projectId, project.id))
      .orderBy(messages.createdAt),
    db
      .select()
      .from(quotes)
      .where(eq(quotes.projectId, project.id))
      .orderBy(desc(quotes.createdAt)),
  ]);

  // Only expose quotes the client should see (not drafts)
  const visibleQuotes = qts.filter((q) => q.status !== "draft");
  const lines =
    visibleQuotes.length > 0
      ? await Promise.all(
          visibleQuotes.map((q) =>
            db
              .select()
              .from(quoteLines)
              .where(eq(quoteLines.quoteId, q.id))
              .orderBy(quoteLines.sortOrder),
          ),
        )
      : [];

  const quotesWithLines = visibleQuotes.map((q, i) => ({
    ...q,
    lines: lines[i] ?? [],
  }));

  return {
    project,
    client: clientRow[0] ?? null,
    photos,
    messages: msgs,
    quotes: quotesWithLines,
  };
}
