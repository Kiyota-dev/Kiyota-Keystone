import { useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Globe,
  Key,
  ShieldCheck,
  Server,
  Users,
  Building2,
  LayoutGrid,
  ScrollText,
  LogOut,
} from "lucide-react";
import { api, getKeystoneAccessToken } from "./api.ts";
import { Card } from "./components/ui/Card.tsx";
import { Button } from "./components/ui/Button.tsx";
import { Alert } from "./components/ui/Alert.tsx";
import { Tabs } from "./components/ui/Tabs.tsx";
import { Badge } from "./components/ui/Badge.tsx";
import { LoginForm } from "./components/LoginForm.tsx";

const API_BASE = import.meta.env.VITE_KEYSTONE_API_URL || "http://localhost:4001";

interface DataTabState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export default function Dashboard() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<{ email?: string; role?: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState("overview");
  const [health, setHealth] = useState<{ status: string } | null>(null);
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const [users, setUsers] = useState<DataTabState<{ users: unknown[] }>>({ data: null, loading: false, error: null });
  const [organizations, setOrganizations] = useState<DataTabState<{ organizations: unknown[] }>>({ data: null, loading: false, error: null });
  const [applications, setApplications] = useState<DataTabState<{ applications: unknown[] }>>({ data: null, loading: false, error: null });
  const [auditLogs, setAuditLogs] = useState<DataTabState<{ logs: unknown[] }>>({ data: null, loading: false, error: null });

  useEffect(() => {
    setToken(getKeystoneAccessToken());
  }, []);

  useEffect(() => {
    if (!token) {
      setAuthLoading(false);
      return;
    }

    setAuthLoading(true);
    setAuthError(null);

    api
      .getMe()
      .then((result) => {
        setUser(result.user as { email?: string; role?: string });
      })
      .catch((err) => {
        setAuthError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => setAuthLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token) return;

    setOverviewLoading(true);
    setOverviewError(null);

    Promise.all([api.getHealth(), api.getOpenIdConfig()])
      .then(([h, c]) => {
        setHealth(h);
        setConfig(c);
      })
      .catch((err) => {
        setOverviewError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => setOverviewLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token) return;

    switch (activeTab) {
      case "users":
        loadTab(users, setUsers, api.getUsers);
        break;
      case "organizations":
        loadTab(organizations, setOrganizations, api.getOrganizations);
        break;
      case "applications":
        loadTab(applications, setApplications, api.getApplications);
        break;
      case "audit-logs":
        loadTab(auditLogs, setAuditLogs, api.getAuditLogs);
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, token]);

  async function loadTab<T>(
    state: DataTabState<T>,
    setState: (value: DataTabState<T>) => void,
    fetcher: () => Promise<T>
  ) {
    if (state.data) return;
    setState({ ...state, loading: true, error: null });
    try {
      const data = await fetcher();
      setState({ data, loading: false, error: null });
    } catch (err) {
      setState({ data: null, loading: false, error: err instanceof Error ? err.message : String(err) });
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("keystone-access-token");
    window.location.reload();
  };

  if (!token) {
    return <LoginForm onLogin={() => window.location.reload()} />;
  }

  const tabs = [
    { id: "overview", label: "Overview", icon: <Activity className="w-4 h-4" /> },
    { id: "organizations", label: "Organizations", icon: <Building2 className="w-4 h-4" /> },
    { id: "applications", label: "Applications", icon: <LayoutGrid className="w-4 h-4" /> },
    { id: "users", label: "Users", icon: <Users className="w-4 h-4" /> },
    { id: "audit-logs", label: "Audit Logs", icon: <ScrollText className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="top-bar-glass sticky top-0 z-20 h-16 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg btn-gold flex items-center justify-center">
            <span className="text-sm font-bold">K</span>
          </div>
          <div>
            <h1 className="text-[15px] font-semibold txt-head">Keystone Admin</h1>
            <p className="text-[11px] txt-muted">Identity Platform</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {health ? (
            <Badge variant={health.status === "ok" ? "success" : "warning"}>
              {health.status === "ok" ? "Healthy" : health.status}
            </Badge>
          ) : null}
          {user && (
            <span className="hidden sm:inline text-[13px] txt-muted">
              {user.email}
            </span>
          )}
          <Button variant="secondary" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => window.open(`${API_BASE}/documentation`, "_blank")}
          >
            API Docs
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-6">
        {authLoading || overviewLoading ? (
          <div className="py-20 flex flex-col items-center gap-3 text-muted-foreground">
            <Activity className="w-8 h-8 animate-spin text-gold" />
            <p className="text-[14px]">Loading dashboard…</p>
          </div>
        ) : authError ? (
          <Alert variant="error" className="mb-4">
            Unable to authenticate: {authError}
          </Alert>
        ) : overviewError ? (
          <Alert variant="error" className="mb-4">
            Unable to load dashboard data: {overviewError}
          </Alert>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-semibold txt-head mb-1">Welcome to Keystone</h2>
              <p className="text-[13px] txt-muted">
                Your identity platform is running. Manage applications, users, and integrations from the API or build additional admin screens here.
              </p>
            </div>

            <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

            {activeTab === "overview" && (
              <>
                <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <Card variant="glass" className="p-5 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center text-gold">
                      <Server className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[12px] txt-muted uppercase tracking-wide font-semibold">API URL</p>
                      <p className="text-[13px] txt-head font-medium break-all">{API_BASE}</p>
                    </div>
                  </Card>

                  <Card variant="glass" className="p-5 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[12px] txt-muted uppercase tracking-wide font-semibold">Status</p>
                      <p className="text-[13px] txt-head font-medium">
                        {health?.status === "ok" ? "Operational" : health?.status || "Unknown"}
                      </p>
                    </div>
                  </Card>

                  <Card variant="glass" className="p-5 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[12px] txt-muted uppercase tracking-wide font-semibold">Issuer</p>
                      <p className="text-[13px] txt-head font-medium break-all">
                        {(config?.issuer as string) || "—"}
                      </p>
                    </div>
                  </Card>
                </div>

                <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card variant="glass" className="p-5">
                    <h3 className="text-[14px] font-semibold txt-head mb-4 flex items-center gap-2">
                      <Key className="w-4 h-4 text-gold" />
                      OIDC Endpoints
                    </h3>
                    <ul className="space-y-3">
                      {[
                        ["Authorization", config?.authorization_endpoint],
                        ["Token", config?.token_endpoint],
                        ["UserInfo", config?.userinfo_endpoint],
                        ["JWKS", config?.jwks_uri],
                        ["Revocation", config?.revocation_endpoint],
                      ].map(([label, value]) => (
                        <li key={label as string} className="flex flex-col gap-0.5">
                          <span className="text-[11px] txt-muted uppercase tracking-wide font-semibold">
                            {label as string}
                          </span>
                          <code className="text-[12px] txt-head bg-surface px-2 py-1 rounded-lg break-all">
                            {(value as string) || "—"}
                          </code>
                        </li>
                      ))}
                    </ul>
                  </Card>

                  <Card variant="glass" className="p-5">
                    <h3 className="text-[14px] font-semibold txt-head mb-4 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      Setup Complete
                    </h3>
                    <p className="text-[13px] txt-muted mb-4">
                      Keystone is configured and ready to authenticate users and applications. You can now register applications and integrate sign-in flows.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => window.open(`${API_BASE}/documentation`, "_blank")}
                      >
                        Open API Docs
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => window.open(`${API_BASE}/.well-known/openid-configuration`, "_blank")}
                      >
                        View OIDC Config
                      </Button>
                    </div>
                  </Card>
                </div>
              </>
            )}

            {activeTab === "organizations" && (
              <DataTabPanel
                title="Organizations"
                icon={<Building2 className="w-4 h-4 text-gold" />}
                state={organizations}
                columns={["id", "name", "slug", "plan", "createdAt"]}
                rows={organizations.data?.organizations ?? []}
              />
            )}

            {activeTab === "applications" && (
              <DataTabPanel
                title="Applications"
                icon={<LayoutGrid className="w-4 h-4 text-gold" />}
                state={applications}
                columns={["id", "orgId", "clientId", "name", "isActive", "createdAt"]}
                rows={applications.data?.applications ?? []}
              />
            )}

            {activeTab === "users" && (
              <DataTabPanel
                title="Users"
                icon={<Users className="w-4 h-4 text-gold" />}
                state={users}
                columns={["id", "email", "username", "name", "role", "emailVerified", "createdAt"]}
                rows={users.data?.users ?? []}
              />
            )}

            {activeTab === "audit-logs" && (
              <DataTabPanel
                title="Audit Logs"
                icon={<ScrollText className="w-4 h-4 text-gold" />}
                state={auditLogs}
                columns={["id", "event", "userId", "orgId", "createdAt"]}
                rows={auditLogs.data?.logs ?? []}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

interface DataTabPanelProps<T extends Record<string, unknown>> {
  title: string;
  icon: React.ReactNode;
  state: DataTabState<T>;
  columns: string[];
  rows: unknown[];
}

function DataTabPanel<T extends Record<string, unknown>>({
  title,
  icon,
  state,
  columns,
  rows,
}: DataTabPanelProps<T>) {
  if (state.loading) {
    return (
      <div className="py-20 flex flex-col items-center gap-3 text-muted-foreground">
        <Activity className="w-8 h-8 animate-spin text-gold" />
        <p className="text-[14px]">Loading {title.toLowerCase()}…</p>
      </div>
    );
  }

  if (state.error) {
    return (
      <Alert variant="error" className="mt-6">
        Unable to load {title.toLowerCase()}: {state.error}
      </Alert>
    );
  }

  return (
    <Card variant="glass" className="mt-6 p-5 overflow-hidden">
      <h3 className="text-[14px] font-semibold txt-head mb-4 flex items-center gap-2">
        {icon}
        {title}
      </h3>
      {rows.length === 0 ? (
        <p className="text-[13px] txt-muted">No {title.toLowerCase()} found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-theme/30">
                {columns.map((col) => (
                  <th key={col} className="text-left py-2 pr-4 txt-muted font-medium uppercase tracking-wide">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const record = row as Record<string, unknown>;
                return (
                  <tr key={index} className="border-b border-theme/10 last:border-0">
                    {columns.map((col) => (
                      <td key={col} className="py-2 pr-4 txt-body break-all">
                        {formatCellValue(record[col])}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
