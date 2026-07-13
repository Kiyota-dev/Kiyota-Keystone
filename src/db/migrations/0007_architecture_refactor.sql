-- Password hashing and email verification support
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_hash" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified_token" text;
ALTER TABLE "users" ALTER COLUMN "zitadel_user_id" DROP NOT NULL;

-- Identity providers that Keystone can delegate authentication to
CREATE TABLE IF NOT EXISTS "identity_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"provider_type" text NOT NULL,
	"name" text NOT NULL,
	"issuer" text,
	"authorization_endpoint" text,
	"token_endpoint" text,
	"userinfo_endpoint" text,
	"jwks_uri" text,
	"client_id" text,
	"client_secret_encrypted" text,
	"scopes" text[] DEFAULT '{"openid","profile","email"}'::text[] NOT NULL,
	"attribute_mapping" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_federation" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "identity_providers" ADD CONSTRAINT "identity_providers_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "identity_providers_org_idx" ON "identity_providers" USING btree ("org_id");
CREATE INDEX IF NOT EXISTS "identity_providers_type_idx" ON "identity_providers" USING btree ("provider_type");

-- Links between local users and external identities
CREATE TABLE IF NOT EXISTS "user_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider_id" uuid NOT NULL,
	"provider_type" text NOT NULL,
	"external_sub" text NOT NULL,
	"email" text,
	"profile" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"linked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_identities" ADD CONSTRAINT "user_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_identities" ADD CONSTRAINT "user_identities_provider_id_identity_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."identity_providers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_identities_user_idx" ON "user_identities" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "user_identities_provider_sub_idx" ON "user_identities" USING btree ("provider_id", "external_sub");

-- Central secrets store for signing keys, encryption keys, and rotation
CREATE TABLE IF NOT EXISTS "secrets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key_id" text NOT NULL UNIQUE,
	"type" text NOT NULL,
	"value" text NOT NULL,
	"algorithm" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"rotated_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "secrets_type_active_idx" ON "secrets" USING btree ("type", "is_active");

-- Workflow definitions and executions
CREATE TABLE IF NOT EXISTS "workflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid,
	"name" text NOT NULL,
	"trigger" text NOT NULL,
	"definition" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workflows" ADD CONSTRAINT "workflows_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workflows_trigger_idx" ON "workflows" USING btree ("trigger");

CREATE TABLE IF NOT EXISTS "workflow_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"trigger_event" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"log" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workflow_runs_workflow_idx" ON "workflow_runs" USING btree ("workflow_id");
