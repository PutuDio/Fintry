import { and, asc, desc, eq } from "drizzle-orm";
import { transactions } from "../db/schema/transactions";
import type { TransactionType } from "@/domain/types";
import type { Executor } from "./types";

// Repository `transactions`.
// Tidak ada delete fisik: koreksi memakai VOID + replacement (D2).
// Update diizinkan HANYA untuk description/category_id/transaction_date
// (domain_rules.md §17.2) — tidak ada jalur update field finansial di sini.

type TransactionRow = typeof transactions.$inferSelect;
type NewTransaction = typeof transactions.$inferInsert;

export async function insertTransaction(
  tx: Executor,
  input: NewTransaction,
): Promise<TransactionRow> {
  const [row] = await tx.insert(transactions).values(input).returning();
  return row;
}

export async function getTransactionById(
  db: Executor,
  userId: string,
  id: string,
): Promise<TransactionRow | null> {
  const rows = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

/** Kunci transaksi untuk void/edit (ADR-002 §2.4 langkah 3). */
export async function lockTransactionById(
  tx: Executor,
  userId: string,
  id: string,
): Promise<TransactionRow | null> {
  const rows = await tx
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
    .limit(1)
    .for("update");
  return rows[0] ?? null;
}

/** Riwayat: hanya ACTIVE kecuali diminta eksplisit. Terbaru dulu. */
export async function listTransactions(
  db: Executor,
  userId: string,
  opts: {
    limit?: number;
    offset?: number;
    type?: TransactionType;
    includeVoided?: boolean;
  } = {},
): Promise<TransactionRow[]> {
  const conditions = [eq(transactions.userId, userId)];
  if (!opts.includeVoided) {
    conditions.push(eq(transactions.status, "ACTIVE"));
  }
  if (opts.type) {
    conditions.push(eq(transactions.type, opts.type));
  }
  return db
    .select()
    .from(transactions)
    .where(and(...conditions))
    .orderBy(desc(transactions.transactionDate), desc(transactions.createdAt))
    .limit(opts.limit ?? 50)
    .offset(opts.offset ?? 0);
}

export async function markTransactionVoided(
  tx: Executor,
  userId: string,
  id: string,
  voidedAt: Date,
): Promise<TransactionRow | null> {
  const rows = await tx
    .update(transactions)
    .set({ status: "VOIDED", voidedAt, updatedAt: new Date() })
    .where(
      and(
        eq(transactions.id, id),
        eq(transactions.userId, userId),
        eq(transactions.status, "ACTIVE"),
      ),
    )
    .returning();
  return rows[0] ?? null;
}

/** Direct edit non-finansial saja (D2). */
export async function editTransactionDetails(
  tx: Executor,
  userId: string,
  id: string,
  patch: {
    description?: string | null;
    categoryId?: string | null;
    transactionDate?: string;
  },
): Promise<TransactionRow | null> {
  const rows = await tx
    .update(transactions)
    .set({ ...patch, updatedAt: new Date() })
    .where(
      and(
        eq(transactions.id, id),
        eq(transactions.userId, userId),
        eq(transactions.status, "ACTIVE"),
      ),
    )
    .returning();
  return rows[0] ?? null;
}

/** Kronologi replacement: transaksi mana yang menggantikan yang mana. */
export async function listReplacementsOf(
  db: Executor,
  userId: string,
  replacedId: string,
): Promise<TransactionRow[]> {
  return db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.replacesTransactionId, replacedId),
      ),
    )
    .orderBy(asc(transactions.createdAt));
}
