import { and, eq, lt } from "drizzle-orm";
import { pendingIntents } from "../db/schema/pending-intents";
import type { Executor } from "./types";

// Repository `pending_intents` (ADR-002 §2.7, D6).
// Routing deterministik hidup di application layer (stage chat flow);
// repository hanya menyediakan primitive status.

type PendingIntentRow = typeof pendingIntents.$inferSelect;
type NewPendingIntent = typeof pendingIntents.$inferInsert;

export async function insertPendingIntent(
  tx: Executor,
  input: NewPendingIntent,
): Promise<PendingIntentRow> {
  const [row] = await tx.insert(pendingIntents).values(input).returning();
  return row;
}

/** Baris PENDING milik user, termasuk yang sudah lewat TTL —
 *  caller yang menetapkan status EXPIRED bila expires_at terlewat. */
export async function getPendingForUser(
  db: Executor,
  userId: string,
): Promise<PendingIntentRow | null> {
  const rows = await db
    .select()
    .from(pendingIntents)
    .where(
      and(
        eq(pendingIntents.userId, userId),
        eq(pendingIntents.status, "PENDING"),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Transisi PENDING → final (RESOLVED/CANCELLED/EXPIRED).
 *  Final state tidak pernah dibuka kembali; guard WHERE status = PENDING. */
export async function finalizePendingIntent(
  tx: Executor,
  id: string,
  status: "RESOLVED" | "CANCELLED" | "EXPIRED",
): Promise<PendingIntentRow | null> {
  const rows = await tx
    .update(pendingIntents)
    .set({ status, resolvedAt: new Date() })
    .where(
      and(eq(pendingIntents.id, id), eq(pendingIntents.status, "PENDING")),
    )
    .returning();
  return rows[0] ?? null;
}

/** Supersede: PENDING lama dijadikan CANCELLED sebelum yang baru dibuat
 *  (dipanggil dalam transaksi yang sama dengan insert baru). */
export async function cancelPendingForUser(
  tx: Executor,
  userId: string,
): Promise<number> {
  const rows = await tx
    .update(pendingIntents)
    .set({ status: "CANCELLED", resolvedAt: new Date() })
    .where(
      and(
        eq(pendingIntents.userId, userId),
        eq(pendingIntents.status, "PENDING"),
      ),
    )
    .returning({ id: pendingIntents.id });
  return rows.length;
}

/** Antrian cleanup TTL: PENDING yang sudah lewat expires_at. */
export async function listExpiredPending(
  db: Executor,
  now: Date,
): Promise<PendingIntentRow[]> {
  return db
    .select()
    .from(pendingIntents)
    .where(
      and(
        eq(pendingIntents.status, "PENDING"),
        lt(pendingIntents.expiresAt, now),
      ),
    );
}
