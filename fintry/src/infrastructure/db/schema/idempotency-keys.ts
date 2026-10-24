import {
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { timestamptz } from "./common";

// Tabel `idempotency_keys` sesuai ADR-002 bagian 2.2.
// PK komposit (user_id, key). Diinsert dalam transaksi yang sama
// dengan mutasi finansial; duplikat mengembalikan result tersimpan.
// Cleanup berdasarkan created_at — kebijakan retensi ditentukan kemudian.

export const idempotencyKeys = pgTable(
  "idempotency_keys",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    key: text("key").notNull(),
    commandType: text("command_type").notNull(),
    requestHash: text("request_hash").notNull(),
    result: jsonb("result"),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ name: "idempotency_keys_pk", columns: [table.userId, table.key] }),
    index("idempotency_keys_created_idx").on(table.createdAt),
  ],
);
