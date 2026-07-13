CREATE TABLE IF NOT EXISTS "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"client_id" text NOT NULL,
	"client_secret_hash" text NOT NULL,
	"name" text NOT NULL,
	"redirect_uris" text[] DEFAULT '{}'::text[] NOT NULL,
	"allowed_origins" text[] DEFAULT '{}'::text[] NOT NULL,
	"branding" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "applications_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "org_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "org_memberships_unique" UNIQUE("org_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"plan" text DEFAULT 'free' NOT NULL,
	"branding" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "api_keys" ALTER COLUMN "scopes" SET DEFAULT '{"api:read"}'::text[];--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "org_id" uuid;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "app_id" uuid;--> statement-breakpoint
ALTER TABLE "audit_log" ADD COLUMN "org_id" uuid;--> statement-breakpoint
ALTER TABLE "audit_log" ADD COLUMN "app_id" uuid;--> statement-breakpoint
ALTER TABLE "audit_log" ADD COLUMN "request_id" text;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD COLUMN "app_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "default_org_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "applications" ADD CONSTRAINT "applications_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "org_memberships" ADD CONSTRAINT "org_memberships_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "org_memberships" ADD CONSTRAINT "org_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "applications_org_idx" ON "applications" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "applications_client_id_idx" ON "applications" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "org_memberships_org_idx" ON "org_memberships" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "org_memberships_user_idx" ON "org_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organizations_slug_idx" ON "organizations" USING btree ("slug");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_app_id_applications_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."applications"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_app_id_applications_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."applications"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_app_id_applications_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."applications"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_default_org_id_organizations_id_fk" FOREIGN KEY ("default_org_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_org_idx" ON "audit_log" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_app_idx" ON "audit_log" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "refresh_tokens_app_idx" ON "refresh_tokens" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_default_org_idx" ON "users" USING btree ("default_org_id");