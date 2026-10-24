import { sql } from "drizzle-orm";
import {
  check,
  jsonb,
  pgEnum,
  pgTable,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { timestamptz } from "./common";

// Tabel domain `pending_intents` sesuai ADR-002 bagian 2.2.
// Paling banyak satu PENDING per user; TTL 10 menit; routing deterministik.
// Transisi status: tech_stack.md §15.

export const pendingIntentKindEnum = pgEnum("pending_intent_kind", [
  "NEED_CONFIRMATION",
  "NEED_CLARIFICATION",
]);

export const pendingIntentStatusEnum = pgEnum("pending_intent_status", [
  "PENDING",
  "RESOLVED",
  "CANCELLED",
  "EXPIRED",
]);

export const pendingIntents = pgTable(
  "pending_intents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    kind: pendingIntentKindEnum("kind").notNull(),
    status: pendingIntentStatusEnum("status").notNull().default("PENDING"),
    // Structured intent yang sudah lolos Zod validation.
    intent: jsonb("intent").notNull(),
    clarificationContext: jsonb("clarification_context"),
    // created_at + 10 menit.
    expiresAt: timestamptz("expires_at").notNull(),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
    resolvedAt: timestamptz("resolved_at"),
  },
  (table) => [
    // Satu PENDING per user.
    uniqueIndex("pending_intents_user_pending_uidx")
      .on(table.userId)
      .where(sql`${table.status} = 'PENDING'`),

    // PENDING ↔ resolved_at NULL.
    check(
      "pending_intents_resolved_ck",
      sql`(${table.status} = 'PENDING') = (${table.resolvedAt} IS NULL)`,
    ),
  ],
);
