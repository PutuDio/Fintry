import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  date,
  foreignKey,
  index,
  pgEnum,
  pgTable,
  text,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { assets } from "./assets";
import { categories } from "./categories";
import { timestamptz } from "./common";

// Tabel domain `transactions` sesuai ADR-002 bagian 2.2.
// Tiga tipe: INCOME, EXPENSE, TRANSFER. Investment purchase adalah
// TRANSFER biasa ke asset INVESTMENT (tanpa kolom khusus).
// Edit dan void: domain_rules.md §17.

export const transactionTypeEnum = pgEnum("transaction_type", [
  "INCOME",
  "EXPENSE",
  "TRANSFER",
]);

export const transactionStatusEnum = pgEnum("transaction_status", [
  "ACTIVE",
  "VOIDED",
]);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    type: transactionTypeEnum("type").notNull(),
    // Amount selalu positif; arah ditentukan oleh type.
    amount: bigint("amount", { mode: "bigint" }).notNull(),
    sourceAssetId: uuid("source_asset_id"),
    destinationAssetId: uuid("destination_asset_id"),
    description: text("description"),
    categoryId: uuid("category_id"),
    // Tanggal kalender resolved (Asia/Jakarta); Drizzle date string mode.
    transactionDate: date("transaction_date", { mode: "string" }).notNull(),
    status: transactionStatusEnum("status").notNull().default("ACTIVE"),
    voidedAt: timestamptz("voided_at"),
    // Diisi hanya oleh perintah replacement (void + insert dalam satu tx).
    replacesTransactionId: uuid("replaces_transaction_id"),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
    updatedAt: timestamptz("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    // Target FK komposit untuk self-reference (replaces_transaction_id).
    unique("transactions_id_user_id_uk").on(table.id, table.userId),

    // --- Composite foreign keys (ADR-002: semua RESTRICT) ---

    // source_asset_id → assets(id, user_id)
    foreignKey({
      name: "transactions_source_asset_fk",
      columns: [table.sourceAssetId, table.userId],
      foreignColumns: [assets.id, assets.userId],
    }).onDelete("restrict"),

    // destination_asset_id → assets(id, user_id)
    foreignKey({
      name: "transactions_destination_asset_fk",
      columns: [table.destinationAssetId, table.userId],
      foreignColumns: [assets.id, assets.userId],
    }).onDelete("restrict"),

    // category_id → categories(id, user_id)
    foreignKey({
      name: "transactions_category_fk",
      columns: [table.categoryId, table.userId],
      foreignColumns: [categories.id, categories.userId],
    }).onDelete("restrict"),

    // replaces_transaction_id → transactions(id, user_id) (self-ref)
    foreignKey({
      name: "transactions_replaces_fk",
      columns: [table.replacesTransactionId, table.userId],
      foreignColumns: [table.id, table.userId],
    }).onDelete("restrict"),

    // Satu transaksi hanya bisa di-replace sekali.
    uniqueIndex("transactions_replaces_uidx")
      .on(table.replacesTransactionId)
      .where(sql`${table.replacesTransactionId} IS NOT NULL`),

    // --- Indexes ---

    // History utama: riwayat per user, terbaru dulu.
    index("transactions_user_date_idx").on(
      table.userId,
      sql`${table.transactionDate} DESC`,
      sql`${table.createdAt} DESC`,
    ),

    // Filter per tipe pada transaksi aktif.
    index("transactions_user_type_date_idx")
      .on(table.userId, table.type, table.transactionDate)
      .where(sql`${table.status} = 'ACTIVE'`),

    // --- CHECK constraints ---

    check("transactions_amount_positive_ck", sql`${table.amount} > 0`),

    // Shape per type:
    // INCOME: destination only (source NULL)
    // EXPENSE: source only (destination NULL)
    // TRANSFER: both, source ≠ destination
    check(
      "transactions_shape_ck",
      sql`CASE ${table.type}
        WHEN 'INCOME'  THEN ${table.sourceAssetId} IS NULL
                            AND ${table.destinationAssetId} IS NOT NULL
        WHEN 'EXPENSE' THEN ${table.sourceAssetId} IS NOT NULL
                            AND ${table.destinationAssetId} IS NULL
        WHEN 'TRANSFER' THEN ${table.sourceAssetId} IS NOT NULL
                             AND ${table.destinationAssetId} IS NOT NULL
                             AND ${table.sourceAssetId} <> ${table.destinationAssetId}
      END`,
    ),

    // TRANSFER tidak boleh punya kategori.
    check(
      "transactions_transfer_no_category_ck",
      sql`${table.type} <> 'TRANSFER' OR ${table.categoryId} IS NULL`,
    ),

    // Status konsistensi: ACTIVE ↔ voided_at NULL, VOIDED ↔ voided_at NOT NULL.
    check(
      "transactions_status_voided_ck",
      sql`(${table.status} = 'ACTIVE' AND ${table.voidedAt} IS NULL)
       OR (${table.status} = 'VOIDED' AND ${table.voidedAt} IS NOT NULL)`,
    ),

    // Self-replacement tidak boleh.
    check(
      "transactions_no_self_replace_ck",
      sql`${table.replacesTransactionId} <> ${table.id}`,
    ),
  ],
);
