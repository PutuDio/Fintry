ALTER TABLE "assets" ADD COLUMN "admin_fee" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_admin_fee_non_negative_ck" CHECK ("assets"."admin_fee" >= 0);