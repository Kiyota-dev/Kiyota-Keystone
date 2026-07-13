const API_BASE = import.meta.env.VITE_KEYSTONE_API_URL || "";

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

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = localStorage.getItem("keystone-setup-token")?.trim();
  if (token) {
    headers["X-Setup-Token"] = token;
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
  runMigrations: () => fetchJson<{ ok: boolean }>("/setup/migrate", { method: "POST" }),
  restart: () => fetchJson<{ ok: boolean }>("/setup/restart", { method: "POST" }),
  init: (input: SetupInitInput) =>
    fetchJson<SetupInitResponse>("/setup/init", {
      method: "POST",
      body: JSON.stringify(input),
    }),
};
