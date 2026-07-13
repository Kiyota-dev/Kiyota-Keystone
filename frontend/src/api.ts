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
  getAuditLogs: () => fetchJson<{ logs: unknown[] }>("/v1/admin/platform/audit-logs"),
};
