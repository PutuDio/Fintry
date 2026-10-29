import { and, asc, eq, inArray, or } from "drizzle-orm";
import { assets } from "../db/schema/assets";
import { transactions } from "../db/schema/transactions";
import { assetAdjustments } from "../db/schema/asset-adjustments";
import { insertAudit } from "./audit";
import type { AssetType } from "@/domain/types";
import type { Executor } from "./types";
// Repository `assets`. Semua query di-scope userId (lapisan isolasi
// pertama; FK komposit adalah lapisan kedua — ADR-002 §2.8).
// Tidak ada delete: asset tidak pernah dihapus fisik (D4).
// Mutation memakai tx yang caller buka lewat db.transaction();
// read boleh memakai Db global.

type AssetRow = typeof assets.$inferSelect;

export async function createAsset(
  db: Executor,
  input: { userId: string; name: string; type: AssetType },
): Promise<AssetRow> {
  const [row] = await db.insert(assets).values(input).returning();
  return row;
}

export async function getAssetById(
  db: Executor,
  userId: string,
  id: string,
): Promise<AssetRow | null> {
  const rows = await db
    .select()
    .from(assets)
    .where(and(eq(assets.id, id), eq(assets.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function listAssets(
  db: Executor,
  userId: string,
  opts: { activeOnly?: boolean } = {},
): Promise<AssetRow[]> {
  const where = opts.activeOnly
    ? and(eq(assets.userId, userId), eq(assets.isActive, true))
    : eq(assets.userId, userId);
  return db.select().from(assets).where(where).orderBy(asc(assets.name));
}

/**
 * Kunci baris asset untuk mutation: SELECT ... FOR UPDATE,
 * urutan id ASC (ADR-002 §2.4 langkah 4).
 * Caller wajib membandingkan jumlah hasil dengan jumlah id diminta;
 * jumlah berbeda = asset tidak dimiliki user → tolak seluruh operasi.
 */
export async function lockAssetsByIds(
  tx: Executor,
  userId: string,
  ids: readonly string[],
): Promise<AssetRow[]> {
  if (ids.length === 0) return [];
  const uniqueSorted = [...new Set(ids)].sort();
  return tx
    .select()
    .from(assets)
    .where(and(eq(assets.userId, userId), inArray(assets.id, uniqueSorted)))
    .orderBy(asc(assets.id))
    .for("update");
}

/** Update nilai oleh financial engine; hanya valid terhadap baris
 *  hasil lockAssetsByIds pada tx yang sama. */
export async function setAssetValue(
  tx: Executor,
  assetId: string,
  value: bigint,
): Promise<void> {
  await tx
    .update(assets)
    .set({ currentValue: value, updatedAt: new Date() })
    .where(eq(assets.id, assetId));
}

/** Deaktivasi; guard `current_value = 0` ditegakkan juga di SQL
 *  (domain_rules.md §2.1). Mengembalikan null saat tidak lolos. */
export async function deactivateAsset(
  tx: Executor,
  userId: string,
  assetId: string,
): Promise<AssetRow | null> {
  const rows = await tx
    .update(assets)
    .set({ isActive: false, updatedAt: new Date() })
    .where(
      and(
        eq(assets.id, assetId),
        eq(assets.userId, userId),
            eq(assets.currentValue, 0n),
      ),
    )
    .returning();
  return rows[0] ?? null;
}

export async function updateAssetName(
  tx: Executor,
  userId: string,
  assetId: string,
  name: string,
): Promise<AssetRow | null> {
  const rows = await tx
    .update(assets)
    .set({ name: name.trim(), updatedAt: new Date() })
    .where(and(eq(assets.id, assetId), eq(assets.userId, userId)))
    .returning();
  return rows[0] ?? null;
}

/**
 * Hapus akun beserta mutasi dan penyesuaian terkait secara kaskade
 * dalam satu transaksi atomik. Membebaskan constraint unique nama akun
 * sehingga pengguna dapat mereset atau mendaftarkan ulang nama akun tersebut.
 */
export async function deleteAssetWithCascade(
  tx: Executor,
  userId: string,
  assetId: string,
): Promise<boolean> {
  const asset = await getAssetById(tx, userId, assetId);
  if (!asset) return false;

  // 1. Hapus transaksi terkait akun ini
  await tx.delete(transactions).where(
    and(
      eq(transactions.userId, userId),
      or(
        eq(transactions.sourceAssetId, assetId),
        eq(transactions.destinationAssetId, assetId),
      ),
    ),
  );

  // 2. Hapus riwayat penyesuaian saldo akun ini
  await tx.delete(assetAdjustments).where(
    and(
      eq(assetAdjustments.userId, userId),
      eq(assetAdjustments.assetId, assetId),
    ),
  );

  // 3. Hapus baris asset
  const deleted = await tx
    .delete(assets)
    .where(and(eq(assets.id, assetId), eq(assets.userId, userId)))
    .returning();

  if (deleted.length === 0) return false;

  // 4. Catat audit log
  await insertAudit(tx, {
    userId,
    entityType: "ASSET",
    entityId: assetId,
    action: "ASSET_DEACTIVATED",
    beforeState: {
      name: asset.name,
      type: asset.type,
      currentValue: asset.currentValue.toString(),
      deletedCascade: true,
    },
  });
  return true;
}
