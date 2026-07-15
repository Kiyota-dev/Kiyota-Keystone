import { useMemo, useState } from "react";
import { Code2, Copy, Check, Info } from "lucide-react";
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

        <div className="mt-6 space-y-4 text-[12px] txt-muted">
          <div className="flex items-center gap-2 txt-head">
            <Info className="w-4 h-4 text-gold" />
            <span className="font-medium">How the script works</span>
          </div>

          <p>
            Copy the script above and paste it into the <code>&lt;head&gt;</code> of your HTML page.
            The SDK connects to Keystone and automatically wires up forms and buttons by their IDs or data attributes.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="font-medium txt-head">Script attributes</p>
              <ul className="space-y-1.5">
                <li>
                  <code className="text-gold">data-keystone-url</code>
                  <p>Your Keystone API base URL. The SDK loads itself from here and sends all requests here.</p>
                </li>
                <li>
                  <code className="text-gold">data-keystone-client-id</code>
                  <p>The application&apos;s public client ID in Keystone. Tells Keystone which app the user is signing in to.</p>
                </li>
                <li>
                  <code className="text-gold">data-keystone-callback</code>
                  <p>URL where Keystone redirects after Google / OAuth login. Must match a Redirect URI in the app settings.</p>
                </li>
                <li>
                  <code className="text-gold">data-keystone-autowire</code>
                  <p>When <code>true</code>, the SDK automatically attaches to forms and buttons on the page.</p>
                </li>
                <li>
                  <code className="text-gold">data-keystone-check-session</code>
                  <p>When <code>true</code>, the SDK checks if the user is already signed in on page load.</p>
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <p className="font-medium txt-head">HTML IDs and data attributes</p>
              <ul className="space-y-1.5">
                <li>
                  <code className="text-gold">id=&quot;keystone-login-form&quot;</code>
                  <p>Sign-in form. Needs email and password inputs.</p>
                </li>
                <li>
                  <code className="text-gold">id=&quot;keystone-register-form&quot;</code>
                  <p>Sign-up form. Needs username, email, and password inputs.</p>
                </li>
                <li>
                  <code className="text-gold">id=&quot;keystone-google-btn&quot;</code>
                  <p>Button that starts Google OAuth sign-in.</p>
                </li>
                <li>
                  <code className="text-gold">id=&quot;keystone-logout&quot;</code>
                  <p>Button that signs the user out.</p>
                </li>
                <li>
                  <code className="text-gold">data-keystone-input</code>
                  <p>Put on inputs: <code>email</code>, <code>password</code>, <code>username</code>, <code>name</code>.</p>
                </li>
                <li>
                  <code className="text-gold">data-keystone-field</code>
                  <p>Put on display elements: <code>email</code>, <code>name</code>, <code>username</code>. Auto-filled after login.</p>
                </li>
              </ul>
            </div>
          </div>

          <Alert variant="info" className="text-[12px]">
            Make sure your project URL is in the application&apos;s <strong>Allowed Origins</strong> and the callback URL is in <strong>Redirect URIs</strong>.
          </Alert>
        </div>
      </Card>
    </>
  );
}
