CREATE TYPE "public"."adjustment_type" AS ENUM('OPENING_BALANCE', 'BALANCE_ADJUSTMENT', 'VALUATION');--> statement-breakpoint
CREATE TABLE "asset_adjustments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"type" "adjustment_type" NOT NULL,
	"value_before" bigint NOT NULL,
	"value_after" bigint NOT NULL,
	"delta" bigint NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "asset_adjustments_delta_ck" CHECK ("asset_adjustments"."delta" = "asset_adjustments"."value_after" - "asset_adjustments"."value_before"),
	CONSTRAINT "asset_adjustments_delta_nonzero_ck" CHECK ("asset_adjustments"."delta" <> 0),
	CONSTRAINT "asset_adjustments_value_after_ck" CHECK ("asset_adjustments"."value_after" >= 0),
	CONSTRAINT "asset_adjustments_opening_balance_ck" CHECK ("asset_adjustments"."type" <> 'OPENING_BALANCE' OR "asset_adjustments"."value_before" = 0)
);
--> statement-breakpoint
ALTER TABLE "asset_adjustments" ADD CONSTRAINT "asset_adjustments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_adjustments" ADD CONSTRAINT "asset_adjustments_asset_fk" FOREIGN KEY ("asset_id","user_id") REFERENCES "public"."assets"("id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "asset_adjustments_opening_balance_uidx" ON "asset_adjustments" USING btree ("asset_id") WHERE "asset_adjustments"."type" = 'OPENING_BALANCE';--> statement-breakpoint
CREATE INDEX "asset_adjustments_asset_created_idx" ON "asset_adjustments" USING btree ("asset_id","created_at" DESC);