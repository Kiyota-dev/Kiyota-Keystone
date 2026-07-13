const API_BASE = import.meta.env.VITE_KEYSTONE_API_URL || "http://localhost:4001";

export interface SetupStatus {
  needsSetup: boolean;
  setupToken: boolean;
}

export interface SetupInitInput {
  email: string;
  password: string;
  name?: string;
  username?: string;
}

export interface SetupInitResponse {
  user: {
    id: string;
    email: string;
    username: string;
    role: string;
  };
}

export interface ValidateDatabaseInput {
  databaseUrl: string;
}

export interface ValidateRedisInput {
  redisUrl: string;
}

export interface ValidateEmailInput {
  provider: "none" | "console" | "smtp" | "sendgrid" | "mailgun";
  from: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpSecure?: boolean;
  sendgridApiKey?: string;
  mailgunApiKey?: string;
  mailgunDomain?: string;
  to: string;
}

export interface ValidateSmsInput {
  provider: "none" | "console" | "twilio";
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioFromNumber?: string;
  twilioMessagingServiceSid?: string;
  to: string;
}

export interface SetupConfigInput {
  env: Record<string, string>;
}

export interface SetupConfigResponse {
  ok: boolean;
  backupPath?: string;
}

export interface HealthStatus {
  status: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginTokenResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    username: string;
    name: string | null;
    avatarUrl: string | null;
    emailVerified: boolean;
    plan: string;
    role: string;
    provider: string;
  };
}

export function getKeystoneAccessToken(): string | null {
  return localStorage.getItem("keystone-access-token")?.trim() || null;
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const setupToken = localStorage.getItem("keystone-setup-token")?.trim();
  if (setupToken) {
    headers["X-Setup-Token"] = setupToken;
  }
  const accessToken = getKeystoneAccessToken();
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    headers: { ...headers, ...init?.headers },
    ...init,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  getStatus: () => fetchJson<SetupStatus>("/setup/status"),
  validateDatabase: (input: ValidateDatabaseInput) =>
    fetchJson<{ ok: boolean }>("/setup/validate/db", { method: "POST", body: JSON.stringify(input) }),
  validateRedis: (input: ValidateRedisInput) =>
    fetchJson<{ ok: boolean }>("/setup/validate/redis", { method: "POST", body: JSON.stringify(input) }),
  validateEmail: (input: ValidateEmailInput) =>
    fetchJson<{ ok: boolean }>("/setup/validate/email", { method: "POST", body: JSON.stringify(input) }),
  validateSms: (input: ValidateSmsInput) =>
    fetchJson<{ ok: boolean }>("/setup/validate/sms", { method: "POST", body: JSON.stringify(input) }),
  applyConfig: (input: SetupConfigInput) =>
    fetchJson<SetupConfigResponse>("/setup/config", { method: "POST", body: JSON.stringify(input) }),
  runMigrations: () =>
    fetchJson<{ ok: boolean }>("/setup/migrate", { method: "POST", body: JSON.stringify({}) }),
  restart: () =>
    fetchJson<{ ok: boolean }>("/setup/restart", { method: "POST", body: JSON.stringify({}) }),
  init: (input: SetupInitInput) =>
    fetchJson<SetupInitResponse>("/setup/init", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  // Public discovery / health endpoints used by the post-setup dashboard.
  getHealth: () => fetchJson<HealthStatus>("/health"),
  getOpenIdConfig: () => fetchJson<Record<string, unknown>>("/.well-known/openid-configuration"),

  // Token-based authentication and platform admin endpoints.
  loginToken: (input: LoginInput) =>
    fetchJson<LoginTokenResponse>("/auth/token-login", { method: "POST", body: JSON.stringify(input) }),
  getMe: () => fetchJson<{ user: unknown }>("/auth/me"),
  getUsers: () => fetchJson<{ users: unknown[] }>("/v1/admin/platform/users"),
  getOrganizations: () => fetchJson<{ organizations: unknown[] }>("/v1/admin/platform/organizations"),
  getApplications: () => fetchJson<{ applications: unknown[] }>("/v1/admin/platform/applications"),
  getAuditLogs: (event?: string) =>
    fetchJson<{ logs: unknown[] }>(`/v1/admin/platform/audit-logs${event ? `?event=${encodeURIComponent(event)}` : ""}`),
  getQueueStatus: () => fetchJson<{ queue: string; stats: Array<{ type: string; count: number; failed?: number; delayed?: number }> }>("/v1/admin/platform/queue"),
  getSigningKeys: () => fetchJson<{ keys: Array<{ keyId: string; createdAt: string; expiresAt?: string | null }>; provider: string }>("/v1/admin/platform/keys"),
  rotateSigningKey: () => fetchJson<{ keyId: string; provider: string }>("/v1/admin/platform/keys/rotate", { method: "POST" }),
  getFederationProviders: () => fetchJson<{ providers: Array<{ type: string; name: string; configured: boolean }> }>("/federation/providers"),
  getPlugins: () => fetchJson<{ plugins: Array<{ metadata: { name: string; version: string; description?: string; author?: string; homepage?: string }; extensionPoints: string[] }> }>("/v1/admin/platform/plugins"),
  getPluginExtensionPoints: () => fetchJson<{ extensionPoints: Array<{ name: string; description: string; registered: string[] }> }>("/v1/admin/platform/plugins/extensions"),
  unregisterPlugin: (name: string) => fetchJson<{ success: boolean }>(`/v1/admin/platform/plugins/${encodeURIComponent(name)}`, { method: "DELETE" }),

  // Feature flags and configuration profiles
  getFeatureFlags: () => fetchJson<{ flags: Array<{ key: string; enabled: boolean; description: string | null; source: "database" | "environment" }> }>("/v1/admin/platform/feature-flags"),
  setFeatureFlag: (key: string, enabled: boolean, description?: string) =>
    fetchJson<{ key: string; enabled: boolean }>(`/v1/admin/platform/feature-flags/${encodeURIComponent(key)}`, {
      method: "PUT",
      body: JSON.stringify({ enabled, description }),
    }),
  deleteFeatureFlag: (key: string) =>
    fetchJson<{ success: boolean }>(`/v1/admin/platform/feature-flags/${encodeURIComponent(key)}`, { method: "DELETE" }),
  getConfigurationProfiles: () => fetchJson<{ profiles: Array<{ id: string; name: string; description: string }> }>("/v1/admin/platform/configuration-profiles"),
  getConfigurationProfile: (id: string) => fetchJson<{ profile: { name: string; description: string; values: Record<string, string> } }>(`/v1/admin/platform/configuration-profiles/${encodeURIComponent(id)}`),

  // Platform admin CRUD
  createOrganization: (input: { name: string; slug?: string; plan?: string }) =>
    fetchJson<{ id: string }>("/v1/admin/organizations", { method: "POST", body: JSON.stringify(input) }),
  createApplication: (orgId: string, input: { name: string; redirectUris?: string[]; allowedOrigins?: string[] }) =>
    fetchJson<{ id: string; clientId: string; clientSecret: string }>(`/v1/admin/organizations/${orgId}/applications`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateApplication: (orgId: string, appId: string, input: Partial<{ name: string; redirectUris: string[]; allowedOrigins: string[]; isActive: boolean }>) =>
    fetchJson<unknown>(`/v1/admin/organizations/${orgId}/applications/${appId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  inviteUser: (orgId: string, input: { email: string; role: "owner" | "admin" | "member" }) =>
    fetchJson<{ user: { id: string } }>(`/v1/admin/organizations/${orgId}/invites`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateUser: (userId: string, input: Partial<{ name: string; username: string; role: string; emailVerified: boolean }>) =>
    fetchJson<unknown>(`/v1/admin/platform/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  deactivateUser: (userId: string) =>
    fetchJson<{ success: boolean }>(`/v1/admin/platform/users/${userId}`, { method: "DELETE" }),
};
