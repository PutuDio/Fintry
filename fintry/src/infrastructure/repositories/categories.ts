import { eq, sql } from "drizzle-orm";
import { categories } from "../db/schema/categories";
import type { Executor } from "./types";

// Repository `categories` — find-or-create per user, case-insensitive
// terhadap nama yang SUDAH dinormalisasi domain_rules.md §11.1.
// Validasi normalisasi adalah tanggung jawab caller (domain/category.ts).

type CategoryRow = typeof categories.$inferSelect;

export async function findCategoryByName(
  db: Executor,
  userId: string,
  normalizedName: string,
): Promise<CategoryRow | null> {
  const rows = await db
    .select()
    .from(categories)
    .where(
      sql`${categories.userId} = ${userId} AND lower(${categories.name}) = lower(${normalizedName})`,
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Find-or-create atomik: insert ON CONFLICT DO NOTHING lalu baca
 *  kembali; aman untuk konkurensi dua request kategori sama. */
export async function findOrCreateCategory(
  tx: Executor,
  userId: string,
  normalizedName: string,
): Promise<CategoryRow> {
  const inserted = await tx
    .insert(categories)
    .values({ userId, name: normalizedName })
    .onConflictDoNothing()
    .returning();
  if (inserted[0]) return inserted[0];

  const existing = await findCategoryByName(tx, userId, normalizedName);
  if (!existing) {
    throw new Error(
      "Category insert conflict resolved to no row — concurrent rename state",
    );
  }
  return existing;
}

export async function listCategories(
  db: Executor,
  userId: string,
): Promise<CategoryRow[]> {
  return db
    .select()
    .from(categories)
    .where(eq(categories.userId, userId))
    .orderBy(sql`lower(${categories.name})`);
}
