import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  pgEnum,
  pgTable,
  text,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { timestamptz } from "./common";

// Tabel domain `assets` sesuai ADR-002 bagian 2.2.
// current_value adalah derived state yang hanya diubah financial engine
// di dalam database transaction (row lock + CHECK >= 0 sebagai lapis kedua).

export const assetTypeEnum = pgEnum("asset_type", [
  "BANK",
  "E_WALLET",
  "INVESTMENT",
  "CASH",
]);

export const assets = pgTable(
  "assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    type: assetTypeEnum("type").notNull(),
    // Mode bigint: tidak ada floating point untuk uang (ADR-001 bagian 7).
    currentValue: bigint("current_value", { mode: "bigint" })
      .notNull()
      .default(sql`0`),
    currency: text("currency").notNull().default("IDR"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
    updatedAt: timestamptz("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    // Target foreign key komposit (transactions / asset_adjustments).
    unique("assets_id_user_id_uk").on(table.id, table.userId),
    // Keunikan nama per user, case-insensitive.
    // Dipilih unique expression index (bukan generated column):
    // sesuai bentuk literal UNIQUE (user_id, lower(name)) di ADR-002.
    // Mencakup asset INACTIVE juga — nama tetap terikat karena tidak
    // ada reactivation di MVP.
    uniqueIndex("assets_user_id_lower_name_uidx").on(
      table.userId,
      sql`lower(${table.name})`,
    ),
    // Hot path: daftar asset aktif milik user (dashboard, resolver).
    index("assets_user_id_active_idx")
      .on(table.userId)
      .where(sql`${table.isActive}`),
    check("assets_currency_ck", sql`${table.currency} = 'IDR'`),
    check("assets_name_not_blank_ck", sql`btrim(${table.name}) <> ''`),
    check(
      "assets_current_value_non_negative_ck",
      sql`${table.currentValue} >= 0`,
    ),
  ],
);
