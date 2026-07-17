import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { createApplication, findApplicationByClientId } from "../services/applications.js";
import { createOrganization, findOrganizationBySlug } from "../services/organizations.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SDK_FILE = path.resolve(__dirname, "../../packages/keystone-sdk/dist/keystone-dropin.js");

const ConnectSchema = z.object({
  projectId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/),
  redirectUri: z.string().url().optional(),
  clientId: z.string().optional(),
});

export default async function sdkRoutes(app: FastifyInstance) {
  // Serve the drop-in SDK so external projects can load it with one script tag.
  app.get("/keystone-dropin.js", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const content = await fs.readFile(SDK_FILE, "utf-8");
      return reply
        .header("Content-Type", "application/javascript; charset=utf-8")
        .header("Cache-Control", "public, max-age=3600")
        .send(content);
    } catch (err) {
      app.log.error({ err }, "SDK file not found");
      return reply.status(404).send({ error: "SDK not built. Run npm run build:sdk first." });
    }
  });

  // Public branding lookup for hosted login pages and the drop-in SDK.
  // Returns only display-safe fields — never secrets.
  app.get("/branding/:clientId", async (request: FastifyRequest, reply: FastifyReply) => {
    const { clientId } = request.params as { clientId: string };
    const application = await findApplicationByClientId(clientId);
    if (!application) {
      return reply.status(404).send({ error: "Application not found" });
    }
    const { findOrganizationById } = await import("../services/organizations.js");
    const org = await findOrganizationById(application.orgId);

    type Branding = Record<string, unknown>;
    const orgBranding = (org?.branding ?? {}) as Branding;
    const appBranding = (application.branding ?? {}) as Branding;
    // App-level branding wins over org-level defaults.
    const merged: Branding = { ...orgBranding, ...appBranding };
    const pick = (key: string) => (typeof merged[key] === "string" ? merged[key] : undefined);

    reply.header("Cache-Control", "public, max-age=300");
    return {
      name: pick("companyName") ?? application.name,
      logoUrl: pick("logoUrl"),
      primaryColor: pick("primaryColor"),
      accentColor: pick("accentColor"),
      supportEmail: pick("supportEmail"),
      loginTitle: pick("loginTitle"),
      loginSubtitle: pick("loginSubtitle"),
    };
  });

  // Register or connect an external project/application.
  app.post("/connect", async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = ConnectSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid input", details: parsed.error.issues });
    }

    const { projectId, redirectUri, clientId } = parsed.data;

    try {
      // If clientId is provided, verify the application exists.
      if (clientId) {
        const existing = await findApplicationByClientId(clientId);
        if (!existing) {
          return reply.status(404).send({ error: "Application not found" });
        }
        return reply.send({
          connected: true,
          clientId: existing.clientId,
          message: "Connected to existing application",
        });
      }

      // Otherwise create a new public client application for this project.
      // In production this endpoint should be protected or require an admin API key.
      let defaultOrg = await findOrganizationBySlug("external-projects");
      if (!defaultOrg) {
        defaultOrg = await createOrganization({ name: "External Projects", slug: "external-projects" });
      }

      const app = await createApplication({
        orgId: defaultOrg.id,
        name: projectId,
        clientId: projectId,
        redirectUris: redirectUri ? [redirectUri] : [],
        allowedOrigins: [request.headers.origin || "*"].filter(Boolean),
      });

      return reply.status(201).send({
        connected: true,
        clientId: app.clientId,
        clientSecret: app.clientSecret,
        message: "Application connected to Keystone",
      });
    } catch (err) {
      request.log.error({ err }, "SDK connect failed");
      return reply.status(500).send({ error: "Connection failed" });
    }
  });
}
