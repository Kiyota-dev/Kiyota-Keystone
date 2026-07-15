import { useMemo, useState } from "react";
import { Code2, Copy, Check } from "lucide-react";
import { Card } from "./ui/Card.tsx";
import { Button } from "./ui/Button.tsx";
import { Input } from "./ui/Input.tsx";
import { Label } from "./ui/Label.tsx";
import { Select } from "./ui/Select.tsx";
import { PageHeader } from "./ui/PageHeader.tsx";
import { Alert } from "./ui/Alert.tsx";
import type { DataTabState } from "../Dashboard.tsx";

interface ConnectProjectPanelProps {
  applicationsState: DataTabState<{ applications: unknown[] }>;
  configState: DataTabState<{ values: Record<string, string> }>;
}

interface Application {
  id: string;
  clientId: string;
  name: string;
  orgId: string;
  isActive: boolean;
  allowedOrigins?: string[];
  redirectUris?: string[];
}

export function ConnectProjectPanel({ applicationsState, configState }: ConnectProjectPanelProps) {
  const [selectedAppId, setSelectedAppId] = useState("");
  const [projectUrl, setProjectUrl] = useState("http://localhost:3000");
  const [callbackPath, setCallbackPath] = useState("/callback.html");
  const [copied, setCopied] = useState(false);

  const apps = (applicationsState.data?.applications ?? []) as Application[];
  const selectedApp = apps.find((a) => a.id === selectedAppId);

  const keystoneUrl = useMemo(() => {
    const publicUrl = configState.data?.values?.AUTH_API_PUBLIC_URL;
    if (publicUrl) return publicUrl.replace(/\/$/, "");
    if (typeof window !== "undefined") {
      return `${window.location.protocol}//${window.location.host}`;
    }
    return "http://localhost:4001";
  }, [configState.data]);

  const callbackUrl = useMemo(() => {
    const base = projectUrl.replace(/\/$/, "");
    const path = callbackPath.startsWith("/") ? callbackPath : `/${callbackPath}`;
    return `${base}${path}`;
  }, [projectUrl, callbackPath]);

  const embedCode = useMemo(() => {
    if (!selectedApp) {
      return "<!-- Select an application to generate the connect script -->";
    }
    return `<script src="${keystoneUrl}/sdk/keystone-dropin.js"
        data-keystone-url="${keystoneUrl}"
        data-keystone-client-id="${selectedApp.clientId}"
        data-keystone-callback="${callbackUrl}"
        data-keystone-autowire="true"
        data-keystone-check-session="true"></script>`;
  }, [selectedApp, keystoneUrl, callbackUrl]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <>
      <PageHeader
        title="Connect a Project"
        description="Generate a drop-in script to add Keystone auth to any website or app."
      />

      <Card variant="glass" className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          <div>
            <Label className="text-[12px]">Application</Label>
            <Select value={selectedAppId} onChange={(e) => setSelectedAppId(e.target.value)}>
              <option value="">Select an application</option>
              {apps.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.name} ({app.clientId})
                </option>
              ))}
            </Select>
            {applicationsState.loading && (
              <p className="text-[11px] txt-muted mt-1">Loading applications…</p>
            )}
          </div>

          <div>
            <Label className="text-[12px]">Project URL</Label>
            <Input
              value={projectUrl}
              onChange={(e) => setProjectUrl(e.target.value)}
              placeholder="http://localhost:3000"
            />
            <p className="text-[11px] txt-muted mt-1">
              The URL where your project will be hosted.
            </p>
          </div>

          <div>
            <Label className="text-[12px]">Callback path</Label>
            <Input
              value={callbackPath}
              onChange={(e) => setCallbackPath(e.target.value)}
              placeholder="/callback.html"
            />
          </div>

          <div className="flex items-end">
            <div className="text-[12px] txt-muted">
              Keystone URL: <code className="text-gold">{keystoneUrl}</code>
              <br />
              Callback URL: <code className="text-gold">{callbackUrl}</code>
            </div>
          </div>
        </div>

        {selectedApp && !selectedApp.isActive && (
          <Alert variant="error" className="mb-4">
            This application is disabled. Enable it before using it in production.
          </Alert>
        )}

        <div className="relative">
          <Label className="text-[12px] flex items-center gap-2">
            <Code2 className="w-3.5 h-3.5" />
            Embed code
          </Label>
          <textarea
            readOnly
            value={embedCode}
            className="w-full h-48 mt-2 p-4 rounded-xl bg-surface border border-theme/30 text-[13px] font-mono text-foreground outline-none resize-none"
          />
          <Button
            size="sm"
            variant="secondary"
            onClick={handleCopy}
            className="absolute top-8 right-2"
            disabled={!selectedApp}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>

        <div className="mt-5 space-y-2 text-[12px] txt-muted">
          <p>How to use it:</p>
          <ol className="list-decimal list-inside space-y-1 ml-1">
            <li>Copy the script above.</li>
            <li>Paste it into the <code>&lt;head&gt;</code> of your HTML page.</li>
            <li>Add forms with <code>id=&quot;keystone-login-form&quot;</code> and <code>id=&quot;keystone-register-form&quot;</code>.</li>
            <li>Make sure your project URL is in the application&apos;s Allowed Origins.</li>
          </ol>
        </div>
      </Card>
    </>
  );
}
