import type { User, Application, Organization, OrgMembership } from "./db/schema.js";
import type { KeystonePlugin } from "./services/plugins/types.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: User;
    state: {
      app?: Application;
      org?: Organization;
      membership?: OrgMembership;
    };
  }

  interface FastifyInstance {
    registerPlugin(plugin: KeystonePlugin): void;
  }
}

export interface AuthCookiePayload {
  accessToken: string;
  refreshToken: string;
}

export interface TokenClaims {
  sub: string;
  email?: string;
  username?: string;
  name?: string;
  plan?: string;
  role?: string;
  provider?: string;
  org_id?: string;
  app_id?: string;
  client_id?: string;
  device_fingerprint?: string;
}

export interface PublicUser {
  id: string;
  email: string;
  username: string;
  name: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  plan: string;
  role: string;
  provider: string;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    name: user.name,
    avatarUrl: user.avatarUrl,
    emailVerified: user.emailVerified,
    plan: user.plan,
    role: user.role,
    provider: user.provider,
  };
}
