import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  clients,
  messages,
  projects,
  projectPhotos,
  quotes,
  type projectStatus,
} from "@/lib/db/schema";

export type ProjectStatusValue = (typeof projectStatus.enumValues)[number];

export type AdminProjectsFilter = {
  status?: ProjectStatusValue | "all";
  search?: string;
  limit?: number;
};

export async function listProjectsForAdmin(filter: AdminProjectsFilter = {}) {
  const { status = "all", search = "", limit = 100 } = filter;

  const conditions: SQL[] = [];
  if (status && status !== "all") conditions.push(eq(projects.status, status));
  if (search.trim()) {
    const like = `%${search.trim()}%`;
    const orCond = or(
      ilike(projects.title, like),
      ilike(clients.fullName, like),
      ilike(clients.email, like),
      ilike(projects.city, like),
    );
    if (orCond) conditions.push(orCond);
  }

  const where = conditions.length ? and(...conditions) : undefined;

  return db
    .select({
      id: projects.id,
      title: projects.title,
      status: projects.status,
      projectType: projects.projectType,
      urgency: projects.urgency,
      city: projects.city,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      clientId: clients.id,
      clientName: clients.fullName,
      clientEmail: clients.email,
      clientPhone: clients.phone,
    })
    .from(projects)
    .innerJoin(clients, eq(projects.clientId, clients.id))
    .where(where)
    .orderBy(desc(projects.createdAt))
    .limit(limit);
}

export async function getDashboardKpis() {
  const rows = await db
    .select({
      status: projects.status,
      count: sql<number>`count(*)::int`,
    })
    .from(projects)
    .groupBy(projects.status);

  const byStatus: Record<string, number> = {};
  let total = 0;
  for (const r of rows) {
    byStatus[r.status] = r.count;
    total += r.count;
  }
  return { total, byStatus };
}

export async function getAdminProjectDetail(projectId: string) {
  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  const project = rows[0];
  if (!project) return null;

  const [clientRow, photos, msgs, qts] = await Promise.all([
    db.select().from(clients).where(eq(clients.id, project.clientId)).limit(1),
    db
      .select()
      .from(projectPhotos)
      .where(eq(projectPhotos.projectId, project.id)),
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

  return {
    project,
    client: clientRow[0] ?? null,
    photos,
    messages: msgs,
    quotes: qts,
  };
}
