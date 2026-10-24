import { and, count, desc, eq, inArray } from "drizzle-orm";
import { assets } from "@/infrastructure/db/schema/assets";
import { categories } from "@/infrastructure/db/schema/categories";
import { transactions } from "@/infrastructure/db/schema/transactions";
import type { Executor } from "@/infrastructure/repositories/types";

// Ledger query: riwayat transaksi lengkap untuk halaman history (stage 20).
// Default status ACTIVE; halaman history meminta "ALL" agar transaksi
// VOIDED tetap terlihat (domain_rules.md §17.1: void tidak menghapus history).
// Replacement chain di-resolve lewat `replaces_transaction_id` sehingga UI
// dapat menampilkan kronologi koreksi (D2).

export type LedgerType = "INCOME" | "EXPENSE" | "TRANSFER";
export type LedgerStatusFilter = "ACTIVE" | "VOIDED" | "ALL";

export interface TransactionLedgerItem {
  id: string;
  type: LedgerType;
  amount: bigint;
  sourceAssetId: string | null;
  sourceAssetName: string | null;
  destinationAssetId: string | null;
  destinationAssetName: string | null;
  description: string | null;
  categoryId: string | null;
  categoryName: string | null;
  transactionDate: string;
  status: "ACTIVE" | "VOIDED";
  createdAt: Date;
  replacesTransactionId: string | null;
  replacedByTransactionId: string | null;
}

export interface ListLedgerFilter {
  limit?: number;
  offset?: number;
  status?: LedgerStatusFilter;
  type?: LedgerType;
}

function ledgerConditions(
  userId: string,
  filter: { status?: LedgerStatusFilter; type?: LedgerType },
) {
  const conditions = [eq(transactions.userId, userId)];
  const status = filter.status ?? "ACTIVE";
  if (status !== "ALL") {
    conditions.push(eq(transactions.status, status));
  }
  if (filter.type) {
    conditions.push(eq(transactions.type, filter.type));
  }
  return conditions;
}

/** Get transactions ledger list enriched with category and asset names (domain_rules §11). */
export async function listLedgerTransactions(
  userId: string,
  filter: ListLedgerFilter,
  db: Executor,
): Promise<TransactionLedgerItem[]> {
  const rows = await db
    .select({
      id: transactions.id,
      type: transactions.type,
      amount: transactions.amount,
      sourceAssetId: transactions.sourceAssetId,
      destinationAssetId: transactions.destinationAssetId,
      description: transactions.description,
      categoryId: transactions.categoryId,
      transactionDate: transactions.transactionDate,
      status: transactions.status,
      createdAt: transactions.createdAt,
      replacesTransactionId: transactions.replacesTransactionId,
    })
    .from(transactions)
    .where(and(...ledgerConditions(userId, filter)))
    .orderBy(desc(transactions.transactionDate), desc(transactions.createdAt))
    .limit(filter.limit ?? 50)
    .offset(filter.offset ?? 0);

  // Batch fetch category names
  const categoryIds = [
    ...new Set(rows.map((r) => r.categoryId).filter((id): id is string => id !== null)),
  ];
  const catMap = new Map<string, string>();
  if (categoryIds.length > 0) {
    const userCategories = await db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(and(eq(categories.userId, userId), inArray(categories.id, categoryIds)));
    for (const c of userCategories) {
      catMap.set(c.id, c.name);
    }
  }

  // Batch fetch asset names for source and destination
  const assetIds = [
    ...new Set(
      rows
        .flatMap((r) => [r.sourceAssetId, r.destinationAssetId])
        .filter((id): id is string => id !== null),
    ),
  ];
  const assetMap = new Map<string, string>();
  if (assetIds.length > 0) {
    const userAssets = await db
      .select({ id: assets.id, name: assets.name })
      .from(assets)
      .where(and(eq(assets.userId, userId), inArray(assets.id, assetIds)));
    for (const a of userAssets) {
      assetMap.set(a.id, a.name);
    }
  }

  // Batch resolve replacement chain: which visible transaction was replaced by which newer one
  const rowIds = rows.map((r) => r.id);
  const replacedByMap = new Map<string, string>();
  if (rowIds.length > 0) {
    const replacements = await db
      .select({
        id: transactions.id,
        replacesTransactionId: transactions.replacesTransactionId,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          inArray(transactions.replacesTransactionId, rowIds),
        ),
      );
    for (const r of replacements) {
      if (r.replacesTransactionId) {
        replacedByMap.set(r.replacesTransactionId, r.id);
      }
    }
  }

  return rows.map((r) => ({
    ...r,
    categoryName: r.categoryId ? (catMap.get(r.categoryId) ?? null) : null,
    sourceAssetName: r.sourceAssetId ? (assetMap.get(r.sourceAssetId) ?? null) : null,
    destinationAssetName: r.destinationAssetId
      ? (assetMap.get(r.destinationAssetId) ?? null)
      : null,
    replacedByTransactionId: replacedByMap.get(r.id) ?? null,
  }));
}

/** Total rows matching the filter — dipakai untuk pagination halaman history. */
export async function countLedgerTransactions(
  userId: string,
  filter: { status?: LedgerStatusFilter; type?: LedgerType },
  db: Executor,
): Promise<number> {
  const rows = await db
    .select({ value: count() })
    .from(transactions)
    .where(and(...ledgerConditions(userId, filter)));
  return Number(rows[0]?.value ?? 0);
}
