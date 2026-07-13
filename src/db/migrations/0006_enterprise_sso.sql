CREATE TABLE IF NOT EXISTS "saml_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"idp_entity_id" text,
	"idp_sso_url" text,
	"idp_certificate" text,
	"sp_entity_id" text NOT NULL,
	"sp_acs_url" text NOT NULL,
	"attribute_mapping" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "saml_connections" ADD CONSTRAINT "saml_connections_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "saml_connections_org_idx" ON "saml_connections" USING btree ("org_id");

CREATE TABLE IF NOT EXISTS "oidc_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"issuer" text NOT NULL,
	"authorization_endpoint" text NOT NULL,
	"token_endpoint" text NOT NULL,
	"userinfo_endpoint" text,
	"jwks_uri" text,
	"client_id" text NOT NULL,
	"client_secret" text NOT NULL,
	"scopes" text[] DEFAULT '{"openid","profile","email"}'::text[] NOT NULL,
	"attribute_mapping" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "oidc_connections" ADD CONSTRAINT "oidc_connections_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "oidc_connections_org_idx" ON "oidc_connections" USING btree ("org_id");
