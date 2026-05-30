import { and, asc, desc, eq, gte, ilike, lte, or, sql, type SQL } from "drizzle-orm";
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

export type ProjectSortValue =
  | "created_desc"
  | "created_asc"
  | "updated_desc"
  | "title_asc";

export type AdminProjectsFilter = {
  status?: ProjectStatusValue | "all";
  search?: string;
  projectType?: string;
  urgency?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: ProjectSortValue;
  limit?: number;
};

export async function listProjectsForAdmin(filter: AdminProjectsFilter = {}) {
  const {
    status = "all",
    search = "",
    projectType = "",
    urgency = "",
    dateFrom = "",
    dateTo = "",
    sort = "created_desc",
    limit = 100,
  } = filter;

  const conditions: SQL[] = [];
  if (status && status !== "all") conditions.push(eq(projects.status, status));
  if (projectType.trim()) {
    // projectType is stored as a comma-joined list; match the value as a token
    conditions.push(ilike(projects.projectType, `%${projectType.trim()}%`));
  }
  if (urgency.trim()) conditions.push(eq(projects.urgency, urgency.trim()));
  if (dateFrom.trim()) conditions.push(gte(projects.createdAt, new Date(`${dateFrom.trim()}T00:00:00`)));
  if (dateTo.trim()) conditions.push(lte(projects.createdAt, new Date(`${dateTo.trim()}T23:59:59`)));
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

  const orderBy =
    sort === "created_asc"
      ? asc(projects.createdAt)
      : sort === "updated_desc"
        ? desc(projects.updatedAt)
        : sort === "title_asc"
          ? asc(projects.title)
          : desc(projects.createdAt);

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
    .orderBy(orderBy)
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

export async function getQuoteStats() {
  const rows = await db
    .select({
      status: quotes.status,
      count: sql<number>`count(*)::int`,
      totalSum: sql<string>`coalesce(sum(${quotes.total}), 0)`,
    })
    .from(quotes)
    .groupBy(quotes.status);

  const byStatus: Record<string, number> = {};
  let total = 0;
  let acceptedValue = 0;
  let pendingValue = 0;
  for (const r of rows) {
    byStatus[r.status] = r.count;
    total += r.count;
    const sum = Number(r.totalSum) || 0;
    if (r.status === "accepted") acceptedValue += sum;
    if (r.status === "sent" || r.status === "viewed") pendingValue += sum;
  }
  return { total, byStatus, acceptedValue, pendingValue };
}

export type ActivityItem = {
  kind: "project" | "message" | "quote";
  projectId: string;
  label: string;
  sublabel: string | null;
  at: Date;
};

export async function getRecentActivity(limit = 8): Promise<ActivityItem[]> {
  const [recentProjects, recentMessages, recentQuotes] = await Promise.all([
    db
      .select({
        id: projects.id,
        title: projects.title,
        clientName: clients.fullName,
        createdAt: projects.createdAt,
      })
      .from(projects)
      .innerJoin(clients, eq(projects.clientId, clients.id))
      .orderBy(desc(projects.createdAt))
      .limit(limit),
    db
      .select({
        projectId: messages.projectId,
        direction: messages.direction,
        senderType: messages.senderType,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .orderBy(desc(messages.createdAt))
      .limit(limit),
    db
      .select({
        projectId: quotes.projectId,
        number: quotes.number,
        status: quotes.status,
        updatedAt: quotes.updatedAt,
      })
      .from(quotes)
      .orderBy(desc(quotes.updatedAt))
      .limit(limit),
  ]);

  const items: ActivityItem[] = [
    ...recentProjects.map((p) => ({
      kind: "project" as const,
      projectId: p.id,
      label: p.title,
      sublabel: p.clientName,
      at: p.createdAt,
    })),
    ...recentMessages.map((m) => ({
      kind: "message" as const,
      projectId: m.projectId,
      label: m.direction === "inbound" ? "Message reçu" : "Message envoyé",
      sublabel: m.senderType,
      at: m.createdAt,
    })),
    ...recentQuotes.map((q) => ({
      kind: "quote" as const,
      projectId: q.projectId,
      label: `Devis ${q.number}`,
      sublabel: q.status,
      at: q.updatedAt,
    })),
  ];

  items.sort((a, b) => b.at.getTime() - a.at.getTime());
  return items.slice(0, limit);
}
