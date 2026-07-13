import { useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Globe,
  Key,
  ShieldCheck,
  Server,
  FileJson,
} from "lucide-react";
import { api } from "./api.ts";
import { Card } from "./components/ui/Card.tsx";
import { Button } from "./components/ui/Button.tsx";
import { Alert } from "./components/ui/Alert.tsx";
import { Tabs } from "./components/ui/Tabs.tsx";
import { Badge } from "./components/ui/Badge.tsx";

const API_BASE = import.meta.env.VITE_KEYSTONE_API_URL || "http://localhost:4001";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [health, setHealth] = useState<{ status: string } | null>(null);
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.getHealth(), api.getOpenIdConfig()])
      .then(([h, c]) => {
        setHealth(h);
        setConfig(c);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => setLoading(false));
  }, []);

  const tabs = [
    { id: "overview", label: "Overview", icon: <Activity className="w-4 h-4" /> },
    { id: "openid", label: "OpenID Config", icon: <Key className="w-4 h-4" /> },
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
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-3 text-muted-foreground">
            <Activity className="w-8 h-8 animate-spin text-gold" />
            <p className="text-[14px]">Loading dashboard…</p>
          </div>
        ) : error ? (
          <Alert variant="error" className="mb-4">
            Unable to load dashboard data: {error}
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

            {activeTab === "overview" && (
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
            )}

            {activeTab === "openid" && (
              <Card variant="glass" className="mt-6 p-5">
                <h3 className="text-[14px] font-semibold txt-head mb-4 flex items-center gap-2">
                  <FileJson className="w-4 h-4 text-gold" />
                  OpenID Configuration
                </h3>
                <pre className="text-[12px] txt-body bg-surface p-4 rounded-xl overflow-auto max-h-[60vh]">
                  {JSON.stringify(config, null, 2)}
                </pre>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}
