import {
  requirePermission as requirePermissionService,
  hasPermission as hasPermissionService,
  hasAnyPermission as hasPermissionAnyService,
  type PermissionInput,
} from "../permissions.js";
import { findMembership } from "../organizations.js";
import type { OrgMembership } from "../../db/schema.js";
import type { OrganizationRepository } from "../../repositories/types.js";
import { ok, err, type Result } from "../../lib/result.js";

export { type PermissionInput };
export type OrgRole = "owner" | "admin" | "member";

export class AuthorizationDomainService {
  constructor(private readonly organizations: OrganizationRepository) {}

  async requirePermission(role: string, resource: string, action: string): Promise<Result<void>> {
    try {
      await requirePermissionService(role, resource, action);
      return ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err({ code: "FORBIDDEN", message, statusCode: 403 });
    }
  }

  async hasPermission(role: string, resource: string, action: string): Promise<boolean> {
    return hasPermissionService(role, resource, action);
  }

  async hasAnyPermission(role: string, required: PermissionInput[]): Promise<boolean> {
    return hasPermissionAnyService(role, required);
  }

  async requireOrgRole(userId: string, orgId: string, allowedRoles: OrgRole[]): Promise<Result<OrgMembership>> {
    const membership = await this.organizations.findMembership(orgId, userId);
    if (!membership) {
      return err({ code: "NOT_MEMBER", message: "Not a member of this organization", statusCode: 403 });
    }
    if (!allowedRoles.includes(membership.role as OrgRole)) {
      return err({ code: "INSUFFICIENT_ROLE", message: "Insufficient organization permissions", statusCode: 403 });
    }
    return ok(membership);
  }

  async isOrgMember(userId: string, orgId: string): Promise<OrgMembership | undefined> {
    return this.organizations.findMembership(orgId, userId);
  }
}
