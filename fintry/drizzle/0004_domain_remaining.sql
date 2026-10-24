CREATE TYPE "public"."audit_action" AS ENUM('ASSET_CREATED', 'ASSET_UPDATED', 'ASSET_DEACTIVATED', 'TRANSACTION_CREATED', 'TRANSACTION_UPDATED', 'TRANSACTION_VOIDED', 'ADJUSTMENT_CREATED');--> statement-breakpoint
CREATE TYPE "public"."audit_entity_type" AS ENUM('ASSET', 'TRANSACTION', 'ASSET_ADJUSTMENT');--> statement-breakpoint
CREATE TYPE "public"."pending_intent_kind" AS ENUM('NEED_CONFIRMATION', 'NEED_CLARIFICATION');--> statement-breakpoint
CREATE TYPE "public"."pending_intent_status" AS ENUM('PENDING', 'RESOLVED', 'CANCELLED', 'EXPIRED');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"entity_type" "audit_entity_type" NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" "audit_action" NOT NULL,
	"before_state" jsonb,
	"after_state" jsonb,
	"idempotency_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"user_id" uuid NOT NULL,
	"key" text NOT NULL,
	"command_type" text NOT NULL,
	"request_hash" text NOT NULL,
	"result" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "idempotency_keys_pk" PRIMARY KEY("user_id","key")
);
--> statement-breakpoint
CREATE TABLE "pending_intents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "pending_intent_kind" NOT NULL,
	"status" "pending_intent_status" DEFAULT 'PENDING' NOT NULL,
	"intent" jsonb NOT NULL,
	"clarification_context" jsonb,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	CONSTRAINT "pending_intents_resolved_ck" CHECK (("pending_intents"."status" = 'PENDING') = ("pending_intents"."resolved_at" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_intents" ADD CONSTRAINT "pending_intents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_user_created_idx" ON "audit_log" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity_type","entity_id","created_at");--> statement-breakpoint
CREATE INDEX "idempotency_keys_created_idx" ON "idempotency_keys" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "pending_intents_user_pending_uidx" ON "pending_intents" USING btree ("user_id") WHERE "pending_intents"."status" = 'PENDING';