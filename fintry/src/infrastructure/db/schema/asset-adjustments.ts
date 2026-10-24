import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  foreignKey,
  index,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { assets } from "./assets";
import { timestamptz } from "./common";

// Tabel domain `asset_adjustments` sesuai ADR-002 bagian 2.2.
// Append-only: tidak ada update, void, atau delete di MVP.
// Tipe: OPENING_BALANCE, BALANCE_ADJUSTMENT, VALUATION.
// VALUATION hanya untuk INVESTMENT — enforced oleh engine (cross-table).

export const adjustmentTypeEnum = pgEnum("adjustment_type", [
  "OPENING_BALANCE",
  "BALANCE_ADJUSTMENT",
  "VALUATION",
]);

export const assetAdjustments = pgTable(
  "asset_adjustments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    assetId: uuid("asset_id").notNull(),
    type: adjustmentTypeEnum("type").notNull(),
    valueBefore: bigint("value_before", { mode: "bigint" }).notNull(),
    valueAfter: bigint("value_after", { mode: "bigint" }).notNull(),
    // Generated column: delta = value_after - value_before.
    // Drizzle ORM belum punya .generatedAlwaysAs() untuk bigint yang
    // stabil di generate, jadi ditulis sebagai kolom biasa dengan
    // CHECK konsistensi. Engine wajib mengisi delta = value_after - value_before.
    delta: bigint("delta", { mode: "bigint" }).notNull(),
    reason: text("reason"),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
  },
  (table) => [
    // Composite FK: (asset_id, user_id) → assets(id, user_id), RESTRICT.
    foreignKey({
      name: "asset_adjustments_asset_fk",
      columns: [table.assetId, table.userId],
      foreignColumns: [assets.id, assets.userId],
    }).onDelete("restrict"),

    // Satu OPENING_BALANCE per asset.
    uniqueIndex("asset_adjustments_opening_balance_uidx")
      .on(table.assetId)
      .where(sql`${table.type} = 'OPENING_BALANCE'`),

    // Riwayat adjustment per asset, terbaru dulu.
    index("asset_adjustments_asset_created_idx").on(
      table.assetId,
      sql`${table.createdAt} DESC`,
    ),

    // --- CHECK constraints ---

    // delta harus konsisten dengan value_before dan value_after.
    check(
      "asset_adjustments_delta_ck",
      sql`${table.delta} = ${table.valueAfter} - ${table.valueBefore}`,
    ),

    // Adjustment tidak boleh no-op.
    check(
      "asset_adjustments_delta_nonzero_ck",
      sql`${table.delta} <> 0`,
    ),

    // Nilai setelah adjustment tidak boleh negatif.
    check(
      "asset_adjustments_value_after_ck",
      sql`${table.valueAfter} >= 0`,
    ),

    // OPENING_BALANCE hanya valid jika value_before = 0.
    check(
      "asset_adjustments_opening_balance_ck",
      sql`${table.type} <> 'OPENING_BALANCE' OR ${table.valueBefore} = 0`,
    ),
  ],
);
