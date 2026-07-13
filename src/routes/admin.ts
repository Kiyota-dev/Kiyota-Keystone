import { z } from "zod";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { eq, and, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { orgMemberships, apiKeys, users, organizations, applications, samlConnections, oidcConnections } from "../db/schema.js";
import { getSdk } from "../sdk/index.js";
import { listRegisteredPlugins, listExtensionPoints, unregisterPlugin } from "../services/plugins/registry.js";
import { isFeatureEnabled, listFeatureFlags, setFeatureFlag, deleteFeatureFlag } from "../services/featureFlags.js";
import { listConfigurationProfiles, getConfigurationProfile } from "../services/configuration/profiles.js";
import { getBillingSummary, setOrganizationPlan, provisionBillingCustomer, listPlans } from "../services/billing.js";
import { config } from "../config.js";

import type { OrgRole } from "../services/domain/authorization.js";

const CreateOrgSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().max(64).optional(),
  plan: z.string().max(32).optional(),
});

const CreateAppSchema = z.object({
  name: z.string().min(1).max(255),
  redirectUris: z.array(z.string().url()).optional(),
  allowedOrigins: z.array(z.string()).optional(),
});

const UpdateAppSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  redirectUris: z.array(z.string().url()).optional(),
  allowedOrigins: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

const InviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["owner", "admin", "member"]).default("member"),
});

const UpdateMemberSchema = z.object({
  role: z.enum(["owner", "admin", "member"]),
});

const UpdateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  username: z.string().min(3).max(32).optional(),
  role: z.string().optional(),
  emailVerified: z.boolean().optional(),
});

const RolePermissionSchema = z.object({
  permissionId: z.string().uuid(),
});

const FeatureFlagSchema = z.object({
  enabled: z.boolean(),
  description: z.string().max(500).optional(),
});

const UpdatePlanSchema = z.object({
  plan: z.enum(["free", "starter", "growth", "enterprise"]),
});

const SamlConnectionSchema = z.object({
  name: z.string().min(1).max(255),
  idpEntityId: z.string().min(1).optional(),
  idpSsoUrl: z.string().url().optional(),
  idpCertificate: z.string().optional(),
  spEntityId: z.string().min(1),
  spAcsUrl: z.string().url(),
  attributeMapping: z.record(z.array(z.string())).optional(),
  isActive: z.boolean().optional(),
});

const OidcConnectionSchema = z.object({
  name: z.string().min(1).max(255),
  issuer: z.string().url(),
  authorizationEndpoint: z.string().url(),
  tokenEndpoint: z.string().url(),
  userinfoEndpoint: z.string().url().optional(),
  jwksUri: z.string().url().optional(),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  scopes: z.array(z.string()).optional(),
  attributeMapping: z.record(z.array(z.string())).optional(),
  isActive: z.boolean().optional(),
});

function sendResultError(reply: FastifyReply, result: { success: false; error: { statusCode?: number; message: string; code: string } }) {
  return reply.status(result.error.statusCode ?? 400).send({ error: result.error.message, code: result.error.code });
}

function requireOwner() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await request.server.authenticate(request, reply);
    if (reply.sent) return;

    if (request.user!.role !== "owner") {
      return reply.status(403).send({ error: "Forbidden" });
    }
  };
}

function requireAuthAndRole(allowedRoles: OrgRole[], permission?: { resource: string; action: string }) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await request.server.authenticate(request, reply);
    if (reply.sent) return;

    const { id } = request.params as { id: string };
    const sdk = getSdk();
    const membershipResult = await sdk.authorization.requireOrgRole(request.user!.id, id, allowedRoles);
    if (!membershipResult.success) return sendResultError(reply, membershipResult);
    request.state.membership = membershipResult.data;

    if (permission) {
      const permResult = await sdk.authorization.requirePermission(membershipResult.data.role, permission.resource, permission.action);
      if (!permResult.success) return sendResultError(reply, permResult);
    }
  };
}

export default async function adminRoutes(app: FastifyInstance) {
  const sdk = getSdk();
  const { auditRepository, permissionRepository } = app.container;

  // Platform-level owner-only endpoints.
  app.get("/platform/users", { preHandler: [requireOwner()] }, async () => {
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        name: users.name,
        role: users.role,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(users.createdAt);
    return { users: allUsers };
  });

  app.get("/platform/organizations", { preHandler: [requireOwner()] }, async () => {
    const allOrganizations = await db.select().from(organizations).orderBy(organizations.createdAt);
    return { organizations: allOrganizations };
  });

  app.get("/platform/applications", { preHandler: [requireOwner()] }, async () => {
    const allApplications = await db
      .select({
        id: applications.id,
        orgId: applications.orgId,
        clientId: applications.clientId,
        name: applications.name,
        redirectUris: applications.redirectUris,
        allowedOrigins: applications.allowedOrigins,
        branding: applications.branding,
        isActive: applications.isActive,
        createdAt: applications.createdAt,
        updatedAt: applications.updatedAt,
      })
      .from(applications)
      .orderBy(applications.createdAt);
    return { applications: allApplications };
  });

  app.get("/platform/audit-logs", { preHandler: [requireOwner()] }, async (request) => {
    const query = request.query as { limit?: string; offset?: string; event?: string };
    const logs = await auditRepository.list({
      event: query.event,
      limit: query.limit ? Number(query.limit) : 100,
      offset: query.offset ? Number(query.offset) : 0,
    });
    return { logs };
  });

  app.get("/platform/queue", { preHandler: [requireOwner()] }, async () => {
    const stats = app.container.queue.getStats ? await app.container.queue.getStats() : [];
    return { queue: app.container.queue.constructor.name, stats };
  });

  app.get("/platform/keys", { preHandler: [requireOwner()] }, async () => {
    const keys = await app.container.secretsProvider.listActiveSigningKeys();
    return { keys, provider: app.container.secretsProvider.name };
  });

  app.post("/platform/keys/rotate", { preHandler: [requireOwner()] }, async (request, reply) => {
    const active = await app.container.secretsProvider.rotateSigningKeys();
    await request.audit("platform_signing_key_rotated", { keyId: active.keyId });
    return reply.status(201).send({ keyId: active.keyId, provider: app.container.secretsProvider.name });
  });

  app.get("/platform/plugins", { preHandler: [requireOwner()] }, async () => {
    return { plugins: listRegisteredPlugins() };
  });

  app.get("/platform/plugins/extensions", { preHandler: [requireOwner()] }, async () => {
    return { extensionPoints: listExtensionPoints() };
  });

  app.delete("/platform/plugins/:name", { preHandler: [requireOwner()] }, async (request, reply) => {
    const { name } = request.params as { name: string };
    const removed = unregisterPlugin(name);
    if (!removed) return reply.status(404).send({ error: "Plugin not found" });
    await request.audit("platform_plugin_unregistered", { pluginName: name });
    return { success: true };
  });

  app.get("/platform/feature-flags", { preHandler: [requireOwner()] }, async () => {
    return { flags: await listFeatureFlags() };
  });

  app.get("/platform/feature-flags/:key", { preHandler: [requireOwner()] }, async (request, reply) => {
    const { key } = request.params as { key: string };
    const enabled = await isFeatureEnabled(key);
    return { key, enabled };
  });

  app.put(
    "/platform/feature-flags/:key",
    { preHandler: [requireOwner()] },
    async (request, reply) => {
      const { key } = request.params as { key: string };
      const body = FeatureFlagSchema.parse(request.body);
      const result = await setFeatureFlag(key, body.enabled, body.description);
      await request.audit("platform_feature_flag_updated", { key, enabled: result.enabled });
      return reply.status(result.enabled === body.enabled ? 200 : 201).send(result);
    }
  );

  app.delete("/platform/feature-flags/:key", { preHandler: [requireOwner()] }, async (request, reply) => {
    const { key } = request.params as { key: string };
    const removed = await deleteFeatureFlag(key);
    if (!removed) return reply.status(404).send({ error: "Feature flag not found" });
    await request.audit("platform_feature_flag_deleted", { key });
    return { success: true };
  });

  app.get("/platform/configuration-profiles", { preHandler: [requireOwner()] }, async () => {
    return { profiles: listConfigurationProfiles() };
  });

  app.get("/platform/configuration-profiles/:id", { preHandler: [requireOwner()] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const profile = getConfigurationProfile(id);
    if (!profile) return reply.status(404).send({ error: "Profile not found" });
    return { profile };
  });

  app.patch(
    "/platform/users/:id",
    { preHandler: [requireOwner()] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = UpdateUserSchema.parse(request.body);
      const result = await sdk.identity.updateUserProfile(id, body);
      if (!result.success) return sendResultError(reply, result);
      await request.audit("platform_user_updated", { userId: id, updates: body });
      return result.data;
    }
  );

  app.delete(
    "/platform/users/:id",
    { preHandler: [requireOwner()] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      if (request.user!.id === id) {
        return reply.status(400).send({ error: "Cannot deactivate yourself" });
      }
      const result = await sdk.identity.deactivate(id);
      if (!result.success) return sendResultError(reply, result);
      await request.audit("platform_user_deactivated", { userId: id });
      return { success: true };
    }
  );

  app.post(
    "/organizations",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const body = CreateOrgSchema.parse(request.body);
      const result = await sdk.organization.createOrganization(request.user!.id, body);
      if (!result.success) return sendResultError(reply, result);
      await request.audit("organization_created", { orgId: result.data.id });
      return reply.status(201).send(result.data);
    }
  );

  app.get("/organizations", { preHandler: [app.authenticate] }, async (request) => {
    const orgs = await sdk.organization.listUserOrganizations(request.user!.id);
    return { organizations: orgs };
  });

  app.get("/organizations/:id", { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await sdk.organization.getOrganization(request.user!.id, id);
    if (!result.success) return sendResultError(reply, result);

    const membership = await sdk.authorization.isOrgMember(request.user!.id, id);
    request.state.membership = membership;

    const [countRow] = await db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(orgMemberships)
      .where(eq(orgMemberships.orgId, id));

    return { ...result.data, memberCount: countRow?.count ?? 0, membership };
  });

  app.post(
    "/organizations/:id/applications",
    { preHandler: [requireAuthAndRole(["owner", "admin"], { resource: "application", action: "create" })] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = CreateAppSchema.parse(request.body);
      const result = await sdk.organization.createApplication(request.user!.id, id, body);
      if (!result.success) return sendResultError(reply, result);
      return reply.status(201).send({ ...result.data, clientSecret: result.data.clientSecret });
    }
  );

  app.get(
    "/organizations/:id/applications",
    { preHandler: [requireAuthAndRole(["owner", "admin", "member"], { resource: "application", action: "read" })] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await sdk.organization.listOrganizationApplications(request.user!.id, id);
      if (!result.success) return sendResultError(reply, result);
      return { applications: result.data };
    }
  );

  app.patch(
    "/organizations/:id/applications/:appId",
    { preHandler: [requireAuthAndRole(["owner", "admin"], { resource: "application", action: "update" })] },
    async (request, reply) => {
      const { id, appId } = request.params as { id: string; appId: string };
      const body = UpdateAppSchema.parse(request.body);
      const result = await sdk.organization.updateApplication(request.user!.id, id, appId, body);
      if (!result.success) return sendResultError(reply, result);
      return result.data;
    }
  );

  app.post(
    "/organizations/:id/invites",
    { preHandler: [requireAuthAndRole(["owner", "admin"], { resource: "organization", action: "invite" })] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = InviteSchema.parse(request.body);
      const result = await sdk.organization.inviteMember(request.user!.id, id, body);
      if (!result.success) return sendResultError(reply, result);
      await request.audit("organization_member_invited", {
        orgId: id,
        invitedUserId: result.data.user.id,
        role: body.role,
      });
      return reply.status(201).send(result.data);
    }
  );

  app.get(
    "/organizations/:id/members",
    { preHandler: [requireAuthAndRole(["owner", "admin", "member"], { resource: "organization", action: "read" })] },
    async (request) => {
      const { id } = request.params as { id: string };
      const members = await getSdk().identity.listOrganizationUsers(id);
      return { members };
    }
  );

  app.patch(
    "/organizations/:id/members/:userId",
    { preHandler: [requireAuthAndRole(["owner", "admin"], { resource: "organization", action: "manage_members" })] },
    async (request, reply) => {
      const { id, userId } = request.params as { id: string; userId: string };
      const body = UpdateMemberSchema.parse(request.body);
      const { updateMembershipRole } = await import("../services/organizations.js");
      const updated = await updateMembershipRole(id, userId, body.role);
      if (!updated) return reply.status(404).send({ error: "Membership not found" });
      await request.audit("organization_member_role_updated", { orgId: id, userId, role: body.role });
      return updated;
    }
  );

  app.delete(
    "/organizations/:id/members/:userId",
    { preHandler: [requireAuthAndRole(["owner", "admin"], { resource: "organization", action: "manage_members" })] },
    async (request, reply) => {
      const { id, userId } = request.params as { id: string; userId: string };
      const { removeMembership } = await import("../services/organizations.js");
      const { findMembership, countOwners } = await import("../services/organizations.js");
      const membership = await findMembership(id, userId);
      if (!membership) return reply.status(404).send({ error: "Membership not found" });
      if (membership.role === "owner" && (await countOwners(id)) <= 1) {
        return reply.status(400).send({ error: "Cannot remove the last owner" });
      }
      await removeMembership(id, userId);
      await request.audit("organization_member_removed", { orgId: id, userId });
      return { success: true };
    }
  );

  app.get(
    "/organizations/:id/users",
    { preHandler: [requireAuthAndRole(["owner", "admin", "member"], { resource: "organization", action: "read" })] },
    async (request) => {
      const { id } = request.params as { id: string };
      const users = await sdk.identity.listOrganizationUsers(id);
      return { users };
    }
  );

  app.get(
    "/organizations/:id/users/:userId",
    { preHandler: [requireAuthAndRole(["owner", "admin", "member"], { resource: "organization", action: "read" })] },
    async (request, reply) => {
      const { id, userId } = request.params as { id: string; userId: string };
      const membership = await sdk.authorization.isOrgMember(userId, id);
      if (!membership) return reply.status(404).send({ error: "User is not a member of this organization" });
      const users = await sdk.identity.listOrganizationUsers(id);
      const user = users.find((u) => u.id === userId);
      if (!user) return reply.status(404).send({ error: "User not found" });
      return { user, membership };
    }
  );

  app.patch(
    "/organizations/:id/users/:userId",
    { preHandler: [requireAuthAndRole(["owner", "admin"], { resource: "organization", action: "manage_members" })] },
    async (request, reply) => {
      const { id, userId } = request.params as { id: string; userId: string };
      const body = UpdateUserSchema.parse(request.body);
      const membership = await sdk.authorization.isOrgMember(userId, id);
      if (!membership) return reply.status(404).send({ error: "User is not a member of this organization" });
      const result = await sdk.identity.updateUserProfile(userId, body);
      if (!result.success) return sendResultError(reply, result);
      await request.audit("organization_member_role_updated", { orgId: id, userId, updates: body });
      return result.data;
    }
  );

  app.delete(
    "/organizations/:id/users/:userId",
    { preHandler: [requireAuthAndRole(["owner", "admin"], { resource: "organization", action: "manage_members" })] },
    async (request, reply) => {
      const { id, userId } = request.params as { id: string; userId: string };
      const membership = await sdk.authorization.isOrgMember(userId, id);
      if (!membership) return reply.status(404).send({ error: "User is not a member of this organization" });
      const result = await sdk.identity.deactivate(userId);
      if (!result.success) return sendResultError(reply, result);
      const { removeMembership } = await import("../services/organizations.js");
      await removeMembership(id, userId);
      await request.audit("organization_member_removed", { orgId: id, userId });
      return { success: true };
    }
  );

  app.get("/permissions", { preHandler: [app.authenticate] }, async () => {
    return { permissions: await permissionRepository.list() };
  });

  app.get("/roles/:role/permissions", { preHandler: [app.authenticate] }, async (request) => {
    const { role } = request.params as { role: string };
    return { role, permissions: await permissionRepository.listForRole(role) };
  });

  app.post(
    "/roles/:role/permissions",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { role } = request.params as { role: string };
      const body = RolePermissionSchema.parse(request.body);
      await permissionRepository.assignToRole(role, body.permissionId);
      await request.audit("organization_member_role_updated", { role, permissionId: body.permissionId });
      return reply.status(201).send({ success: true });
    }
  );

  app.delete(
    "/roles/:role/permissions/:permissionId",
    { preHandler: [app.authenticate] },
    async (request) => {
      const { role, permissionId } = request.params as { role: string; permissionId: string };
      await permissionRepository.removeFromRole(role, permissionId);
      await request.audit("organization_member_role_updated", { role, permissionId });
      return { success: true };
    }
  );

  app.get(
    "/organizations/:id/api-keys",
    { preHandler: [requireAuthAndRole(["owner", "admin", "member"], { resource: "api_key", action: "read" })] },
    async (request) => {
      const { id } = request.params as { id: string };
      const keys = await db
        .select({
          id: apiKeys.id,
          name: apiKeys.name,
          prefix: apiKeys.prefix,
          scopes: apiKeys.scopes,
          userId: apiKeys.userId,
          serviceAccountId: apiKeys.serviceAccountId,
          lastUsedAt: apiKeys.lastUsedAt,
          expiresAt: apiKeys.expiresAt,
          revokedAt: apiKeys.revokedAt,
          createdAt: apiKeys.createdAt,
        })
        .from(apiKeys)
        .where(eq(apiKeys.orgId, id));
      return { keys };
    }
  );

  app.delete(
    "/organizations/:id/api-keys/:keyId",
    { preHandler: [requireAuthAndRole(["owner", "admin"], { resource: "api_key", action: "revoke" })] },
    async (request, reply) => {
      const { id, keyId } = request.params as { id: string; keyId: string };
      const [record] = await db
        .update(apiKeys)
        .set({ revokedAt: new Date() })
        .where(and(eq(apiKeys.id, keyId), eq(apiKeys.orgId, id)))
        .returning();
      if (!record) return reply.status(404).send({ error: "API key not found" });
      await request.audit("api_key_revoked", { keyId: record.id, name: record.name, orgId: id });
      return { success: true };
    }
  );

  app.get(
    "/organizations/:id/audit-logs",
    { preHandler: [requireAuthAndRole(["owner", "admin", "member"], { resource: "audit_log", action: "read" })] },
    async (request) => {
      const { id } = request.params as { id: string };
      const query = request.query as { limit?: string; offset?: string; event?: string };
      const logs = await auditRepository.list({
        orgId: id,
        event: query.event,
        limit: query.limit ? Number(query.limit) : 50,
        offset: query.offset ? Number(query.offset) : 0,
      });
      return { logs };
    }
  );

  // Enterprise SSO connections.
  const requireSsoManager = requireAuthAndRole(["owner", "admin"], { resource: "sso_connection", action: "manage" });
  const requireSsoReader = requireAuthAndRole(["owner", "admin", "member"], { resource: "sso_connection", action: "read" });

  app.get(
    "/organizations/:id/saml-connections",
    { preHandler: [requireSsoReader] },
    async (request) => {
      const { id } = request.params as { id: string };
      const connections = await db
        .select({
          id: samlConnections.id,
          name: samlConnections.name,
          idpEntityId: samlConnections.idpEntityId,
          idpSsoUrl: samlConnections.idpSsoUrl,
          spEntityId: samlConnections.spEntityId,
          spAcsUrl: samlConnections.spAcsUrl,
          isActive: samlConnections.isActive,
          createdAt: samlConnections.createdAt,
        })
        .from(samlConnections)
        .where(eq(samlConnections.orgId, id));
      return { connections };
    }
  );

  app.post(
    "/organizations/:id/saml-connections",
    { preHandler: [requireSsoManager] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = SamlConnectionSchema.parse(request.body);
      const [connection] = await db
        .insert(samlConnections)
        .values({
          orgId: id,
          ...body,
          attributeMapping: body.attributeMapping ?? {},
        })
        .returning();
      await request.audit("saml_connection_created", { orgId: id, connectionId: connection.id });
      return reply.status(201).send(connection);
    }
  );

  app.get(
    "/organizations/:id/saml-connections/:connectionId/metadata",
    { preHandler: [requireSsoReader] },
    async (request, reply) => {
      const { connectionId } = request.params as { connectionId: string };
      const [connection] = await db
        .select()
        .from(samlConnections)
        .where(eq(samlConnections.id, connectionId))
        .limit(1);
      if (!connection) return reply.status(404).send({ error: "Connection not found" });

      const base = config.AUTH_API_PUBLIC_URL || `http://localhost:${config.PORT}`;
      const metadata = `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="${connection.spEntityId}">
  <md:SPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="${connection.spAcsUrl}" index="0" isDefault="true"/>
  </md:SPSSODescriptor>
</md:EntityDescriptor>`;
      return reply.header("Content-Type", "application/xml").send(metadata);
    }
  );

  app.delete(
    "/organizations/:id/saml-connections/:connectionId",
    { preHandler: [requireSsoManager] },
    async (request, reply) => {
      const { id, connectionId } = request.params as { id: string; connectionId: string };
      const [record] = await db
        .delete(samlConnections)
        .where(and(eq(samlConnections.id, connectionId), eq(samlConnections.orgId, id)))
        .returning();
      if (!record) return reply.status(404).send({ error: "Connection not found" });
      await request.audit("saml_connection_deleted", { orgId: id, connectionId: record.id });
      return { success: true };
    }
  );

  app.get(
    "/organizations/:id/oidc-connections",
    { preHandler: [requireSsoReader] },
    async (request) => {
      const { id } = request.params as { id: string };
      const connections = await db
        .select({
          id: oidcConnections.id,
          name: oidcConnections.name,
          issuer: oidcConnections.issuer,
          authorizationEndpoint: oidcConnections.authorizationEndpoint,
          tokenEndpoint: oidcConnections.tokenEndpoint,
          userinfoEndpoint: oidcConnections.userinfoEndpoint,
          jwksUri: oidcConnections.jwksUri,
          clientId: oidcConnections.clientId,
          scopes: oidcConnections.scopes,
          isActive: oidcConnections.isActive,
          createdAt: oidcConnections.createdAt,
        })
        .from(oidcConnections)
        .where(eq(oidcConnections.orgId, id));
      return { connections };
    }
  );

  app.post(
    "/organizations/:id/oidc-connections",
    { preHandler: [requireSsoManager] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = OidcConnectionSchema.parse(request.body);
      const [connection] = await db
        .insert(oidcConnections)
        .values({
          orgId: id,
          ...body,
          attributeMapping: body.attributeMapping ?? {},
          scopes: body.scopes ?? ["openid", "profile", "email"],
        })
        .returning();
      await request.audit("oidc_connection_created", { orgId: id, connectionId: connection.id });
      return reply.status(201).send(connection);
    }
  );

  app.delete(
    "/organizations/:id/oidc-connections/:connectionId",
    { preHandler: [requireSsoManager] },
    async (request, reply) => {
      const { id, connectionId } = request.params as { id: string; connectionId: string };
      const [record] = await db
        .delete(oidcConnections)
        .where(and(eq(oidcConnections.id, connectionId), eq(oidcConnections.orgId, id)))
        .returning();
      if (!record) return reply.status(404).send({ error: "Connection not found" });
      await request.audit("oidc_connection_deleted", { orgId: id, connectionId: record.id });
      return { success: true };
    }
  );

  app.get(
    "/organizations/:id/scim-config",
    { preHandler: [requireSsoReader] },
    async (request) => {
      const { id } = request.params as { id: string };
      const base = config.AUTH_API_PUBLIC_URL || `http://localhost:${config.PORT}`;
      return {
        enabled: !!process.env.SCIM_BEARER_TOKEN,
        baseUrl: `${base}/scim/v2`,
        orgId: id,
      };
    }
  );

  // Billing and plans.
  app.get("/billing/plans", { preHandler: [app.authenticate] }, async () => {
    return { plans: listPlans() };
  });

  app.get(
    "/organizations/:id/billing",
    { preHandler: [requireAuthAndRole(["owner", "admin"], { resource: "billing", action: "read" })] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const summary = await getBillingSummary(id);
      return summary;
    }
  );

  app.patch(
    "/organizations/:id/plan",
    { preHandler: [requireAuthAndRole(["owner", "admin"], { resource: "billing", action: "update" })] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = UpdatePlanSchema.parse(request.body);
      const result = await setOrganizationPlan(id, body.plan);
      await request.audit("organization_plan_updated", { orgId: id, plan: body.plan });
      return result;
    }
  );

  app.post(
    "/organizations/:id/billing/customer",
    { preHandler: [requireAuthAndRole(["owner", "admin"], { resource: "billing", action: "update" })] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user!;
      const result = await provisionBillingCustomer(id, user.email!);
      await request.audit("billing_customer_provisioned", { orgId: id });
      return reply.status(201).send(result);
    }
  );
}
