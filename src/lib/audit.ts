import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";

export type ActorType = "admin" | "client" | "system";

export async function recordAudit(args: {
  actorType: ActorType;
  actorId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    await db.insert(auditLog).values({
      actorType: args.actorType,
      actorId: args.actorId ?? null,
      action: args.action,
      entity: args.entity,
      entityId: args.entityId ?? null,
      metadata: args.metadata ?? null,
    });
  } catch (e) {
    // never let audit failures break a business action
    console.error("[audit] failed to record", args.action, e);
  }
}

export async function listAuditForEntity(
  entity: string,
  entityId: string,
  limit = 50,
) {
  return db
    .select()
    .from(auditLog)
    .where(eq(auditLog.entityId, entityId))
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);
}
