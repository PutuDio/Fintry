import { desc, eq } from "drizzle-orm";
import { assetAdjustments } from "../db/schema/asset-adjustments";
import type { Executor } from "./types";

// Repository `asset_adjustments` — APPEND-ONLY (ADR-002 §2.6, D3).
// Tidak ada fungsi update/delete di modul ini; koreksi = adjustment baru.

type AdjustmentRow = typeof assetAdjustments.$inferSelect;
type NewAdjustment = typeof assetAdjustments.$inferInsert;

export async function insertAdjustment(
  tx: Executor,
  input: NewAdjustment,
): Promise<AdjustmentRow> {
  const [row] = await tx
    .insert(assetAdjustments)
    .values(input)
    .returning();
  return row;
}

export async function listAdjustmentsByAsset(
  db: Executor,
  assetId: string,
): Promise<AdjustmentRow[]> {
  return db
    .select()
    .from(assetAdjustments)
    .where(eq(assetAdjustments.assetId, assetId))
    .orderBy(desc(assetAdjustments.createdAt));
}

export async function listAdjustmentsByUser(
  db: Executor,
  userId: string,
  limit = 20,
): Promise<AdjustmentRow[]> {
  return db
    .select()
    .from(assetAdjustments)
    .where(eq(assetAdjustments.userId, userId))
    .orderBy(desc(assetAdjustments.createdAt))
    .limit(limit);
}

/** Untuk reconciliation test: jumlah delta seluruh adjustment asset. */
export async function sumAdjustmentDeltas(
  db: Executor,
  assetId: string,
): Promise<bigint> {
  const rows = await listAdjustmentsByAsset(db, assetId);
  return rows.reduce((acc, r) => acc + r.delta, 0n);
}
