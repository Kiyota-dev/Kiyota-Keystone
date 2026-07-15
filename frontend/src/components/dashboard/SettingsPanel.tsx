import { useEffect, useState } from "react";
import { Settings, Save, RotateCcw } from "lucide-react";
import { api } from "../../api.ts";
import { Button } from "../ui/Button.tsx";
import { Input } from "../ui/Input.tsx";
import { Switch } from "../ui/Switch.tsx";
import { Alert } from "../ui/Alert.tsx";
import { PageHeader } from "../ui/PageHeader.tsx";
import { SectionCard } from "../ui/SectionCard.tsx";
import { FormField } from "../ui/FormField.tsx";
import { LoadingState } from "../ui/LoadingState.tsx";
import { ErrorState } from "../ui/ErrorState.tsx";

interface ConfigValues {
  AUTH_API_PUBLIC_URL?: string;
  CLIENT_APP_URL?: string;
  ALLOWED_ORIGINS?: string;
  COOKIE_DOMAIN?: string;
  COOKIE_SECURE?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  EMAIL_PROVIDER?: string;
  EMAIL_FROM?: string;
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  SMTP_SECURE?: string;
}

export function SettingsPanel() {
  const [config, setConfig] = useState<ConfigValues | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = (await api.getConfig()) as { values: ConfigValues };
      setConfig(data.values);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const update = (key: keyof ConfigValues, value: string) => {
    setConfig((prev) => (prev ? { ...prev, [key]: value } : null));
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.updateConfig({ values: config as Record<string, string> });
      setMessage("Configuration saved. Restart Keystone to apply all changes.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleRestart = async () => {
    setRestarting(true);
    try {
      await api.restartServer();
      setMessage("Server is restarting…");
    } catch {
      setMessage("Server is restarting…");
    } finally {
      setRestarting(false);
    }
  };

  if (loading) return <LoadingState message="Loading settings…" />;
  if (error && !config) return <ErrorState title="Unable to load settings" message={error} />;
  if (!config) return null;

  return (
    <>
      <PageHeader
        title="Settings"
        description="View and update Keystone configuration. Sensitive values are masked."
        action={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={loadConfig}>
              <RotateCcw className="w-4 h-4" />
              Refresh
            </Button>
            <Button size="sm" onClick={handleSave} isLoading={saving}>
              <Save className="w-4 h-4" />
              Save
            </Button>
          </div>
        }
      />

      {message && (
        <Alert variant="success" className="mb-4">
          {message}
        </Alert>
      )}
      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      <div className="space-y-6">
        <SectionCard title={<><Settings className="w-4 h-4 inline mr-2 text-gold" />Platform URLs</>}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Auth API public URL">
              <Input value={config.AUTH_API_PUBLIC_URL || ""} onChange={(e) => update("AUTH_API_PUBLIC_URL", e.target.value)} />
            </FormField>
            <FormField label="Client app URL">
              <Input value={config.CLIENT_APP_URL || ""} onChange={(e) => update("CLIENT_APP_URL", e.target.value)} />
            </FormField>
            <FormField label="Allowed origins">
              <Input value={config.ALLOWED_ORIGINS || ""} onChange={(e) => update("ALLOWED_ORIGINS", e.target.value)} />
            </FormField>
            <FormField label="Cookie domain" hint="Use .yourdomain.com for production">
              <Input value={config.COOKIE_DOMAIN || ""} onChange={(e) => update("COOKIE_DOMAIN", e.target.value)} />
            </FormField>
          </div>
          <div className="mt-4">
            <Switch
              label="Secure cookies"
              description="Required for HTTPS production"
              checked={config.COOKIE_SECURE === "true"}
              onChange={(e) => update("COOKIE_SECURE", (e.target as HTMLInputElement).checked ? "true" : "false")}
            />
          </div>
        </SectionCard>

        <SectionCard title="OAuth Connectors">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Google Client ID">
              <Input value={config.GOOGLE_CLIENT_ID || ""} onChange={(e) => update("GOOGLE_CLIENT_ID", e.target.value)} />
            </FormField>
            <FormField label="Google Client Secret">
              <Input
                type="password"
                value={config.GOOGLE_CLIENT_SECRET || ""}
                onChange={(e) => update("GOOGLE_CLIENT_SECRET", e.target.value)}
                placeholder="••••••••"
              />
            </FormField>
            <FormField label="GitHub Client ID">
              <Input value={config.GITHUB_CLIENT_ID || ""} onChange={(e) => update("GITHUB_CLIENT_ID", e.target.value)} />
            </FormField>
            <FormField label="GitHub Client Secret">
              <Input
                type="password"
                value={config.GITHUB_CLIENT_SECRET || ""}
                onChange={(e) => update("GITHUB_CLIENT_SECRET", e.target.value)}
                placeholder="••••••••"
              />
            </FormField>
          </div>
        </SectionCard>

        <SectionCard title="Email (SMTP)">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="From address">
              <Input value={config.EMAIL_FROM || ""} onChange={(e) => update("EMAIL_FROM", e.target.value)} />
            </FormField>
            <FormField label="SMTP host">
              <Input value={config.SMTP_HOST || ""} onChange={(e) => update("SMTP_HOST", e.target.value)} />
            </FormField>
            <FormField label="SMTP port">
              <Input value={config.SMTP_PORT || ""} onChange={(e) => update("SMTP_PORT", e.target.value)} />
            </FormField>
            <FormField label="SMTP user">
              <Input value={config.SMTP_USER || ""} onChange={(e) => update("SMTP_USER", e.target.value)} />
            </FormField>
            <FormField label="SMTP password">
              <Input
                type="password"
                value={config.SMTP_PASS || ""}
                onChange={(e) => update("SMTP_PASS", e.target.value)}
                placeholder="••••••••"
              />
            </FormField>
          </div>
          <div className="mt-4">
            <Switch
              label="SMTP secure"
              checked={config.SMTP_SECURE === "true"}
              onChange={(e) => update("SMTP_SECURE", (e.target as HTMLInputElement).checked ? "true" : "false")}
            />
          </div>
        </SectionCard>

        <div className="flex items-center justify-between">
          <p className="text-[12px] txt-muted">
            Restart Keystone after saving URL or cookie changes.
          </p>
          <Button variant="secondary" onClick={handleRestart} isLoading={restarting}>
            Restart Keystone
          </Button>
        </div>
      </div>
    </>
  );
}
