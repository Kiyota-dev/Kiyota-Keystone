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
  Plug,
  Lock,
  Puzzle,
  ToggleLeft,
} from "lucide-react";
import { api, getKeystoneAccessToken } from "./api.ts";
import { Card } from "./components/ui/Card.tsx";
import { Button } from "./components/ui/Button.tsx";
import { Alert } from "./components/ui/Alert.tsx";
import { Tabs } from "./components/ui/Tabs.tsx";
import { Badge } from "./components/ui/Badge.tsx";
import { LoginForm } from "./components/LoginForm.tsx";
import { OrganizationsPanel } from "./components/OrganizationsPanel.tsx";
import { ApplicationsPanel } from "./components/ApplicationsPanel.tsx";
import { UsersPanel } from "./components/UsersPanel.tsx";
import { AuditLogsPanel } from "./components/AuditLogsPanel.tsx";
import { KeysPanel } from "./components/KeysPanel.tsx";
import { PluginsPanel } from "./components/PluginsPanel.tsx";
import { FeatureFlagsPanel } from "./components/FeatureFlagsPanel.tsx";

const API_BASE = import.meta.env.VITE_KEYSTONE_API_URL || "http://localhost:4001";

export interface DataTabState<T> {
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
  const [queueStatus, setQueueStatus] = useState<{ queue: string; stats: unknown[] } | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const [users, setUsers] = useState<DataTabState<{ users: unknown[] }>>({ data: null, loading: false, error: null });
  const [organizations, setOrganizations] = useState<DataTabState<{ organizations: unknown[] }>>({ data: null, loading: false, error: null });
  const [applications, setApplications] = useState<DataTabState<{ applications: unknown[] }>>({ data: null, loading: false, error: null });
  const [auditLogs, setAuditLogs] = useState<DataTabState<{ logs: unknown[] }>>({ data: null, loading: false, error: null });
  const [providers, setProviders] = useState<DataTabState<{ providers: Array<{ type: string; name: string; configured: boolean }> }>>({ data: null, loading: false, error: null });
  const [keys, setKeys] = useState<DataTabState<{ keys: Array<{ keyId: string; createdAt: string; expiresAt?: string | null }>; provider: string }>>({ data: null, loading: false, error: null });
  const [plugins, setPlugins] = useState<DataTabState<{ plugins: Array<{ metadata: { name: string; version: string; description?: string; author?: string; homepage?: string }; extensionPoints: string[] }> }>>({ data: null, loading: false, error: null });
  const [extensions, setExtensions] = useState<DataTabState<{ extensionPoints: Array<{ name: string; description: string; registered: string[] }> }>>({ data: null, loading: false, error: null });
  const [featureFlags, setFeatureFlags] = useState<DataTabState<{ flags: Array<{ key: string; enabled: boolean; description: string | null; source: "database" | "environment" }> }>>({ data: null, loading: false, error: null });
  const [configProfiles, setConfigProfiles] = useState<DataTabState<{ profiles: Array<{ id: string; name: string; description: string }> }>>({ data: null, loading: false, error: null });

  const refreshUsers = () => loadTab({ data: null, loading: false, error: null }, setUsers, api.getUsers);
  const refreshOrganizations = () => loadTab({ data: null, loading: false, error: null }, setOrganizations, api.getOrganizations);
  const refreshApplications = () => loadTab({ data: null, loading: false, error: null }, setApplications, api.getApplications);
  const refreshAuditLogs = (event?: string) =>
    loadTab({ data: null, loading: false, error: null }, setAuditLogs, () => api.getAuditLogs(event));
  const refreshKeys = () => loadTab({ data: null, loading: false, error: null }, setKeys, api.getSigningKeys);
  const refreshPlugins = () => {
    loadTab({ data: null, loading: false, error: null }, setPlugins, api.getPlugins);
    loadTab({ data: null, loading: false, error: null }, setExtensions, api.getPluginExtensionPoints);
  };
  const handleUnregisterPlugin = async (name: string) => {
    await api.unregisterPlugin(name);
    refreshPlugins();
  };
  const refreshFeatureFlags = () => {
    loadTab({ data: null, loading: false, error: null }, setFeatureFlags, api.getFeatureFlags);
    loadTab({ data: null, loading: false, error: null }, setConfigProfiles, api.getConfigurationProfiles);
  };
  const handleToggleFeatureFlag = async (key: string, enabled: boolean) => {
    await api.setFeatureFlag(key, enabled);
    refreshFeatureFlags();
  };
  const handleDeleteFeatureFlag = async (key: string) => {
    await api.deleteFeatureFlag(key);
    refreshFeatureFlags();
  };
  const handleCreateFeatureFlag = async (key: string, enabled: boolean, description?: string) => {
    await api.setFeatureFlag(key, enabled, description);
    refreshFeatureFlags();
  };

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

    Promise.all([api.getHealth(), api.getOpenIdConfig(), api.getQueueStatus()])
      .then(([h, c, q]) => {
        setHealth(h);
        setConfig(c);
        setQueueStatus(q);
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
      case "identity-providers":
        loadTab(providers, setProviders, api.getFederationProviders);
        break;
      case "keys":
        loadTab(keys, setKeys, api.getSigningKeys);
        break;
      case "plugins":
        loadTab(plugins, setPlugins, api.getPlugins);
        loadTab(extensions, setExtensions, api.getPluginExtensionPoints);
        break;
      case "feature-flags":
        loadTab(featureFlags, setFeatureFlags, api.getFeatureFlags);
        loadTab(configProfiles, setConfigProfiles, api.getConfigurationProfiles);
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
    { id: "identity-providers", label: "Identity Providers", icon: <Plug className="w-4 h-4" /> },
    { id: "keys", label: "Keys", icon: <Lock className="w-4 h-4" /> },
    { id: "plugins", label: "Plugins", icon: <Puzzle className="w-4 h-4" /> },
    { id: "feature-flags", label: "Feature Flags", icon: <ToggleLeft className="w-4 h-4" /> },
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
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

                  <Card variant="glass" className="p-5 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                      <Activity className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[12px] txt-muted uppercase tracking-wide font-semibold">Queue</p>
                      <p className="text-[13px] txt-head font-medium">
                        {queueStatus?.queue ?? "—"}
                      </p>
                      {queueStatus && queueStatus.stats.length > 0 && (
                        <p className="text-[11px] txt-muted mt-0.5">
                          {queueStatus.stats.map((s) => `${(s as { type: string }).type}: ${(s as { count: number }).count}${(s as { failed?: number }).failed ? ` / ${(s as { failed?: number }).failed} failed` : ""}`).join(" · ")}
                        </p>
                      )}
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
              <OrganizationsPanel state={organizations} onRefresh={refreshOrganizations} />
            )}

            {activeTab === "applications" && (
              <ApplicationsPanel
                state={applications}
                organizations={organizations}
                onRefresh={refreshApplications}
              />
            )}

            {activeTab === "users" && (
              <UsersPanel state={users} onRefresh={refreshUsers} />
            )}

            {activeTab === "identity-providers" && (
              <IdentityProvidersPanel state={providers} />
            )}

            {activeTab === "keys" && (
              <KeysPanel state={keys} onRefresh={refreshKeys} />
            )}

            {activeTab === "plugins" && (
              <PluginsPanel
                pluginsState={plugins}
                extensionsState={extensions}
                onRefresh={refreshPlugins}
                onUnregister={handleUnregisterPlugin}
              />
            )}

            {activeTab === "feature-flags" && (
              <FeatureFlagsPanel
                flagsState={featureFlags}
                profilesState={configProfiles}
                onRefresh={refreshFeatureFlags}
                onToggle={handleToggleFeatureFlag}
                onDelete={handleDeleteFeatureFlag}
                onCreate={handleCreateFeatureFlag}
              />
            )}

            {activeTab === "audit-logs" && (
              <AuditLogsPanel state={auditLogs} onRefresh={refreshAuditLogs} />
            )}
          </>
        )}
      </main>
    </div>
  );
}

interface IdentityProvidersPanelProps {
  state: DataTabState<{ providers: Array<{ type: string; name: string; configured: boolean }> }>;
}

function IdentityProvidersPanel({ state }: IdentityProvidersPanelProps) {
  if (state.loading) {
    return (
      <div className="py-20 flex flex-col items-center gap-3 text-muted-foreground">
        <Activity className="w-8 h-8 animate-spin text-gold" />
        <p className="text-[14px]">Loading identity providers…</p>
      </div>
    );
  }

  if (state.error) {
    return (
      <Alert variant="error" className="mt-6">
        Unable to load identity providers: {state.error}
      </Alert>
    );
  }

  const providers = state.data?.providers ?? [];

  return (
    <Card variant="glass" className="mt-6 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[14px] font-semibold txt-head flex items-center gap-2">
          <Plug className="w-4 h-4 text-gold" />
          Identity Providers
        </h3>
        <span className="text-[11px] txt-muted">
          {providers.filter((p) => p.configured).length} of {providers.length} configured
        </span>
      </div>

      {providers.length === 0 ? (
        <p className="text-[13px] txt-muted">No identity providers available.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {providers.map((provider) => (
            <div
              key={provider.type}
              className={`flex items-center justify-between p-3 rounded-xl border ${
                provider.configured
                  ? "border-emerald-500/30 bg-emerald-500/[0.05]"
                  : "border-theme/20 bg-surface"
              }`}
            >
              <span className="text-[13px] font-medium txt-head capitalize">{provider.name}</span>
              <Badge variant={provider.configured ? "success" : "default"}>
                {provider.configured ? "Configured" : "Not configured"}
              </Badge>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 p-3 rounded-xl bg-surface border border-theme/20">
        <p className="text-[12px] txt-muted">
          Configure providers in the setup wizard or by setting environment variables such as{" "}
          <code className="font-mono text-gold">GOOGLE_CLIENT_ID</code> and{" "}
          <code className="font-mono text-gold">GOOGLE_CLIENT_SECRET</code>. Users can then sign in
          through the federation endpoints.
        </p>
      </div>
    </Card>
  );
}
