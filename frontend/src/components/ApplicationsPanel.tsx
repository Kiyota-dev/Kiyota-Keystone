import { memo, useState } from "react";
import { LayoutGrid, Plus, Save, X, Power, Shield } from "lucide-react";
import { api } from "../api.ts";
import { Card } from "./ui/Card.tsx";
import { Button } from "./ui/Button.tsx";
import { Alert } from "./ui/Alert.tsx";
import { Input } from "./ui/Input.tsx";
import { Label } from "./ui/Label.tsx";
import { Select } from "./ui/Select.tsx";
import { DataTable } from "./DataTable.tsx";
import { FieldHelp } from "./ui/FieldHelp.tsx";
import { useUiMode } from "../hooks/useUiMode.ts";
import { useToastContext } from "./ui/ToastProvider.tsx";
import { APPLICATION_TEMPLATES } from "../lib/templates.ts";
import type { DataTabState } from "../Dashboard.tsx";

interface ApplicationsPanelProps {
  state: DataTabState<{ applications: unknown[] }>;
  organizations: DataTabState<{ organizations: unknown[] }>;
  onRefresh: () => void;
}

function ApplicationsPanelBase({ state, organizations, onRefresh }: ApplicationsPanelProps) {
  const { mode } = useUiMode();
  const { addToast } = useToastContext();
  const [showForm, setShowForm] = useState(false);
  const [orgId, setOrgId] = useState("");
  const [name, setName] = useState("");
  const [redirectUris, setRedirectUris] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [ipEditApp, setIpEditApp] = useState<Record<string, unknown> | null>(null);
  const [allowedIps, setAllowedIps] = useState("");
  const [blockedIps, setBlockedIps] = useState("");

  const orgOptions = organizations.data?.organizations ?? [];

  const reset = () => {
    setError(null);
    setSuccess(null);
    setCreatedSecret(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    reset();
    if (!orgId) {
      setError("Select an organization");
      return;
    }
    setBusy(true);
    try {
      const result = await api.createApplication(orgId, {
        name,
        redirectUris: redirectUris.split(",").map((s) => s.trim()).filter(Boolean),
      });
      setSuccess(`Application created. Client ID: ${result.clientId}`);
      addToast("Application created successfully", "success");
      setCreatedSecret(result.clientSecret);
      setName("");
      setRedirectUris("");
      setShowForm(false);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create application");
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (app: Record<string, unknown>) => {
    reset();
    setBusy(true);
    try {
      await api.updateApplication(String(app.orgId), String(app.id), { isActive: !app.isActive });
      setSuccess("Application updated");
      addToast("Application status updated", "success");
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update application");
    } finally {
      setBusy(false);
    }
  };

  const openIpEditor = (app: Record<string, unknown>) => {
    reset();
    setIpEditApp(app);
    setAllowedIps(((app.allowedIps as string[]) ?? []).join(", "));
    setBlockedIps(((app.blockedIps as string[]) ?? []).join(", "));
  };

  const saveIpControls = async () => {
    if (!ipEditApp) return;
    reset();
    setBusy(true);
    try {
      await api.updateApplication(String(ipEditApp.orgId), String(ipEditApp.id), {
        allowedIps: allowedIps.split(",").map((s) => s.trim()).filter(Boolean),
        blockedIps: blockedIps.split(",").map((s) => s.trim()).filter(Boolean),
      });
      setSuccess("IP controls updated");
      addToast("IP controls updated", "success");
      setIpEditApp(null);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update IP controls");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card variant="glass" className="mt-6 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[14px] font-semibold txt-head flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-gold" />
          Applications
        </h3>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>
          <Plus className="w-4 h-4" />
          {showForm ? "Cancel" : "Create"}
        </Button>
      </div>

      {success && <Alert variant="success" className="mb-4">{success}</Alert>}
      {error && <Alert variant="error" className="mb-4">{error}</Alert>}
      {createdSecret && (
        <Alert variant="info" className="mb-4">
          Client secret (copy now, it will not be shown again): {" "}
          <code className="font-mono text-gold break-all">{createdSecret}</code>
        </Alert>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-5 p-3 sm:p-4 rounded-xl bg-surface border border-theme/20 space-y-3">
          <div>
            <Label className="text-[12px]">Organization</Label>
            <Select value={orgId} onChange={(e) => setOrgId(e.target.value)} required>
              <option value="">Select organization</option>
              {orgOptions.map((org: unknown) => {
                const o = org as Record<string, unknown>;
                return (
                  <option key={String(o.id)} value={String(o.id)}>
                    {String(o.name)}
                  </option>
                );
              })}
            </Select>
          </div>
          <div>
            <Label className="text-[12px]">Application name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My App" required />
          </div>
          <div>
            <Label className="text-[12px]">Template</Label>
            <Select
              value={templateId}
              onChange={(e) => {
                const id = e.target.value;
                setTemplateId(id);
                const tpl = APPLICATION_TEMPLATES.find((t) => t.id === id);
                if (tpl) {
                  setRedirectUris(tpl.redirectUris.join(", "));
                }
              }}
            >
              <option value="">No template</option>
              {APPLICATION_TEMPLATES.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name}
                </option>
              ))}
            </Select>
            {templateId && (
              <p className="text-[11px] txt-muted mt-1">
                {APPLICATION_TEMPLATES.find((t) => t.id === templateId)?.description}
              </p>
            )}
          </div>
          <FieldHelp
            label="Redirect URIs"
            help="Where users are sent after signing in with an external provider like Google. Must match the URI configured in the provider console."
            example="http://localhost:5173/callback, https://app.example.com/auth/callback"
          >
            <Input value={redirectUris} onChange={(e) => setRedirectUris(e.target.value)} placeholder="http://localhost:5173/callback" />
          </FieldHelp>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button type="submit" size="sm" isLoading={busy} disabled={!name || !orgId}>
              <Save className="w-4 h-4" />
              Save
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => setShowForm(false)}>
              <X className="w-4 h-4" />
              Cancel
            </Button>
          </div>
        </form>
      )}

      {ipEditApp && (
        <div className="mb-5 p-3 sm:p-4 rounded-xl bg-surface border border-theme/20 space-y-3">
          <p className="text-[13px] font-semibold txt-head flex items-center gap-2">
            <Shield className="w-4 h-4 text-gold" />
            IP controls — {String(ipEditApp.name)}
          </p>
          <FieldHelp
            label="Allowed IPs"
            help="If set, only these IPs or CIDR ranges may sign in to this application. Leave empty to allow all."
            example="203.0.113.10, 198.51.100.0/24"
          >
            <Input value={allowedIps} onChange={(e) => setAllowedIps(e.target.value)} placeholder="203.0.113.0/24" />
          </FieldHelp>
          <FieldHelp
            label="Blocked IPs"
            help="These IPs or CIDR ranges are always rejected, even if they match the allowed list."
            example="192.0.2.55, 2001:db8::/32"
          >
            <Input value={blockedIps} onChange={(e) => setBlockedIps(e.target.value)} placeholder="192.0.2.55" />
          </FieldHelp>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button size="sm" onClick={saveIpControls} isLoading={busy}>
              <Save className="w-4 h-4" />
              Save
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setIpEditApp(null)}>
              <X className="w-4 h-4" />
              Cancel
            </Button>
          </div>
        </div>
      )}

      <DataTable
        state={state}
        columns={mode === "simple" ? ["name", "isActive"] : ["id", "orgId", "clientId", "name", "isActive", "createdAt"]}
        rows={state.data?.applications ?? []}
        emptyMessage="No applications found."
        renderRowActions={(row) => (
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => openIpEditor(row)} disabled={busy} title="IP controls">
              <Shield className="w-3 h-3" />
            </Button>
            <Button size="sm" variant="secondary" onClick={() => toggleActive(row)} disabled={busy}>
              <Power className="w-3 h-3 mr-1" />
              {row.isActive ? "Disable" : "Enable"}
            </Button>
          </div>
        )}
      />
    </Card>
  );
}

export const ApplicationsPanel = memo(ApplicationsPanelBase);
