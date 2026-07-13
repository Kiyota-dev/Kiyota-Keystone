const API_BASE = import.meta.env.VITE_KEYSTONE_API_URL || "/api";

export interface SetupStatus {
  needsSetup: boolean;
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

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
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
  init: (input: SetupInitInput) =>
    fetchJson<SetupInitResponse>("/setup/init", {
      method: "POST",
      body: JSON.stringify(input),
    }),
};
