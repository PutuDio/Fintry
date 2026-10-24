import { and, desc, eq } from "drizzle-orm";
import { auditLog } from "../db/schema/audit-log";
import type { Executor } from "./types";

// Repository `audit_log` — APPEND-ONLY (ADR-002 §2.2).
// Tidak ada update/delete. entity_id polimorfik, tanpa FK.

type AuditRow = typeof auditLog.$inferSelect;
type NewAudit = typeof auditLog.$inferInsert;

export async function insertAudit(
  tx: Executor,
  input: NewAudit,
): Promise<AuditRow> {
  const [row] = await tx.insert(auditLog).values(input).returning();
  return row;
}

export async function listAuditByUser(
  db: Executor,
  userId: string,
  limit = 50,
): Promise<AuditRow[]> {
  return db
    .select()
    .from(auditLog)
    .where(eq(auditLog.userId, userId))
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);
}

export async function listAuditByEntity(
  db: Executor,
  entityType: typeof auditLog.$inferInsert.entityType,
  entityId: string,
): Promise<AuditRow[]> {
  return db
    .select()
    .from(auditLog)
    .where(
      and(
        eq(auditLog.entityType, entityType),
        eq(auditLog.entityId, entityId),
      ),
    )
    .orderBy(desc(auditLog.createdAt));
}
