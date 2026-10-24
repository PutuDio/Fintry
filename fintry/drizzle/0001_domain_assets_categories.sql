CREATE TYPE "public"."asset_type" AS ENUM('BANK', 'E_WALLET', 'INVESTMENT');--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "asset_type" NOT NULL,
	"current_value" bigint DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'IDR' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assets_id_user_id_uk" UNIQUE("id","user_id"),
	CONSTRAINT "assets_currency_ck" CHECK ("assets"."currency" = 'IDR'),
	CONSTRAINT "assets_name_not_blank_ck" CHECK (btrim("assets"."name") <> ''),
	CONSTRAINT "assets_current_value_non_negative_ck" CHECK ("assets"."current_value" >= 0)
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_id_user_id_uk" UNIQUE("id","user_id"),
	CONSTRAINT "categories_name_length_ck" CHECK (char_length("categories"."name") BETWEEN 1 AND 40),
	CONSTRAINT "categories_name_not_blank_ck" CHECK (btrim("categories"."name") <> '')
);
--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "assets_user_id_lower_name_uidx" ON "assets" USING btree ("user_id",lower("name"));--> statement-breakpoint
CREATE INDEX "assets_user_id_active_idx" ON "assets" USING btree ("user_id") WHERE "assets"."is_active";--> statement-breakpoint
CREATE UNIQUE INDEX "categories_user_id_lower_name_uidx" ON "categories" USING btree ("user_id",lower("name"));