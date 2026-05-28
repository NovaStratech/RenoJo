"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects, projectStatus } from "@/lib/db/schema";
import { requireAdmin, getCurrentUser } from "@/lib/auth/session";
import { recordAudit } from "@/lib/audit";

const STATUSES = projectStatus.enumValues as readonly string[];

export async function updateProjectStatus(
  locale: string,
  projectId: string,
  newStatus: string,
) {
  await requireAdmin(locale);
  const admin = await getCurrentUser();
  if (!STATUSES.includes(newStatus)) {
    throw new Error("invalid status");
  }
  await db
    .update(projects)
    .set({
      status: newStatus as (typeof projectStatus.enumValues)[number],
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId));
  await recordAudit({
    actorType: "admin",
    actorId: admin?.id,
    action: "project.status_changed",
    entity: "project",
    entityId: projectId,
    metadata: { to: newStatus },
  });
  revalidatePath(`/${locale}/admin/projets/${projectId}`);
  revalidatePath(`/${locale}/admin/projets`);
  revalidatePath(`/${locale}/admin`);
}
