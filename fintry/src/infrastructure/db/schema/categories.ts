import { sql } from "drizzle-orm";
import {
  check,
  pgTable,
  text,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { timestamptz } from "./common";

// Tabel domain `categories` sesuai ADR-002 bagian 2.2.
// Per-user, dibuat via find-or-create (domain_rules.md 11.1).
// Normalisasi NFKC/whitespace dan validasi karakter dilakukan di
// application layer; database hanya menjaga panjang dan non-blank.
// Manajemen kategori (rename/merge/delete) P1: tanpa updated_at.

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
  },
  (table) => [
    unique("categories_id_user_id_uk").on(table.id, table.userId),
    uniqueIndex("categories_user_id_lower_name_uidx").on(
      table.userId,
      sql`lower(${table.name})`,
    ),
    check(
      "categories_name_length_ck",
      sql`char_length(${table.name}) BETWEEN 1 AND 40`,
    ),
    check("categories_name_not_blank_ck", sql`btrim(${table.name}) <> ''`),
  ],
);
