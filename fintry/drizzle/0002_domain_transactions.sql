CREATE TYPE "public"."transaction_status" AS ENUM('ACTIVE', 'VOIDED');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('INCOME', 'EXPENSE', 'TRANSFER');--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "transaction_type" NOT NULL,
	"amount" bigint NOT NULL,
	"source_asset_id" uuid,
	"destination_asset_id" uuid,
	"description" text,
	"category_id" uuid,
	"transaction_date" date NOT NULL,
	"status" "transaction_status" DEFAULT 'ACTIVE' NOT NULL,
	"voided_at" timestamp with time zone,
	"replaces_transaction_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_id_user_id_uk" UNIQUE("id","user_id"),
	CONSTRAINT "transactions_amount_positive_ck" CHECK ("transactions"."amount" > 0),
	CONSTRAINT "transactions_shape_ck" CHECK (CASE "transactions"."type"
        WHEN 'INCOME'  THEN "transactions"."source_asset_id" IS NULL
                            AND "transactions"."destination_asset_id" IS NOT NULL
        WHEN 'EXPENSE' THEN "transactions"."source_asset_id" IS NOT NULL
                            AND "transactions"."destination_asset_id" IS NULL
        WHEN 'TRANSFER' THEN "transactions"."source_asset_id" IS NOT NULL
                             AND "transactions"."destination_asset_id" IS NOT NULL
                             AND "transactions"."source_asset_id" <> "transactions"."destination_asset_id"
      END),
	CONSTRAINT "transactions_transfer_no_category_ck" CHECK ("transactions"."type" <> 'TRANSFER' OR "transactions"."category_id" IS NULL),
	CONSTRAINT "transactions_status_voided_ck" CHECK (("transactions"."status" = 'ACTIVE' AND "transactions"."voided_at" IS NULL)
       OR ("transactions"."status" = 'VOIDED' AND "transactions"."voided_at" IS NOT NULL)),
	CONSTRAINT "transactions_no_self_replace_ck" CHECK ("transactions"."replaces_transaction_id" <> "transactions"."id")
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_source_asset_fk" FOREIGN KEY ("source_asset_id","user_id") REFERENCES "public"."assets"("id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_destination_asset_fk" FOREIGN KEY ("destination_asset_id","user_id") REFERENCES "public"."assets"("id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_fk" FOREIGN KEY ("category_id","user_id") REFERENCES "public"."categories"("id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_replaces_fk" FOREIGN KEY ("replaces_transaction_id","user_id") REFERENCES "public"."transactions"("id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_replaces_uidx" ON "transactions" USING btree ("replaces_transaction_id") WHERE "transactions"."replaces_transaction_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "transactions_user_date_idx" ON "transactions" USING btree ("user_id","transaction_date" DESC,"created_at" DESC);--> statement-breakpoint
CREATE INDEX "transactions_user_type_date_idx" ON "transactions" USING btree ("user_id","type","transaction_date") WHERE "transactions"."status" = 'ACTIVE';