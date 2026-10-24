import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { timestamptz } from "./common";

// Tabel `audit_log` sesuai ADR-002 bagian 2.2.
// Append-only: tidak ada update atau delete di MVP.
// entity_id bersifat polimorfik (tanpa FK).

export const auditEntityTypeEnum = pgEnum("audit_entity_type", [
  "ASSET",
  "TRANSACTION",
  "ASSET_ADJUSTMENT",
]);

export const auditActionEnum = pgEnum("audit_action", [
  "ASSET_CREATED",
  "ASSET_UPDATED",
  "ASSET_DEACTIVATED",
  "TRANSACTION_CREATED",
  "TRANSACTION_UPDATED",
  "TRANSACTION_VOIDED",
  "ADJUSTMENT_CREATED",
]);

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    entityType: auditEntityTypeEnum("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    action: auditActionEnum("action").notNull(),
    beforeState: jsonb("before_state"),
    afterState: jsonb("after_state"),
    idempotencyKey: text("idempotency_key"),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
  },
  (table) => [
    // Riwayat per user, terbaru dulu.
    index("audit_log_user_created_idx").on(
      table.userId,
      table.createdAt,
    ),
    // Lookup per entity.
    index("audit_log_entity_idx").on(
      table.entityType,
      table.entityId,
      table.createdAt,
    ),
  ],
);
