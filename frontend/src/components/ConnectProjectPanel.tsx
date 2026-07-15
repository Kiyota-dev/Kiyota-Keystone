import { memo, useMemo, useState } from "react";
import {
  Code2,
  Copy,
  Check,
  Info,
  Rocket,
  Shield,
  Globe,
  ArrowRight,
  LayoutTemplate,
  FileCode,
  Braces,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { Card } from "./ui/Card.tsx";
import { Button } from "./ui/Button.tsx";
import { Input } from "./ui/Input.tsx";
import { Label } from "./ui/Label.tsx";
import { Select } from "./ui/Select.tsx";
import { PageHeader } from "./ui/PageHeader.tsx";
import { Alert } from "./ui/Alert.tsx";
import { Badge } from "./ui/Badge.tsx";
import { SectionCard } from "./ui/SectionCard.tsx";
import { Tabs } from "./ui/Tabs.tsx";
import { CodeBlock } from "./ui/CodeBlock.tsx";
import { Advanced } from "./ui/Advanced.tsx";
import { useUiMode } from "../hooks/useUiMode.ts";
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

type CodeTab = "html" | "react" | "vue";

function ConnectProjectPanelBase({ applicationsState, configState }: ConnectProjectPanelProps) {
  const { mode } = useUiMode();
  const [selectedAppId, setSelectedAppId] = useState("");
  const [projectUrl, setProjectUrl] = useState("http://localhost:3000");
  const [callbackPath, setCallbackPath] = useState("/callback.html");
  const [activeTab, setActiveTab] = useState<CodeTab>("html");
  const [framework, setFramework] = useState<"html" | "react" | "vue">("html");
  const [showSecret, setShowSecret] = useState(false);
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

  const callbackOk = useMemo(() => {
    if (!selectedApp?.redirectUris?.length) return true;
    return selectedApp.redirectUris.includes(callbackUrl);
  }, [selectedApp, callbackUrl]);

  const originOk = useMemo(() => {
    if (!selectedApp?.allowedOrigins?.length) return true;
    try {
      return selectedApp.allowedOrigins.includes(new URL(projectUrl).origin);
    } catch {
      return false;
    }
  }, [selectedApp, projectUrl]);

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

  const reactCode = useMemo(() => {
    if (!selectedApp) {
      return "// Select an application to generate the connect code";
    }
    return `// Add this to the <head> of your root HTML file
<script src="${keystoneUrl}/sdk/keystone-dropin.js"
  data-keystone-url="${keystoneUrl}"
  data-keystone-client-id="${selectedApp.clientId}"
  data-keystone-callback="${callbackUrl}"
  data-keystone-autowire="true"
  data-keystone-check-session="true"></script>

// Then use these IDs in any React component
export default function AuthPage() {
  return (
    <div>
      <form id="keystone-login-form">
        <input data-keystone-input="email" type="email" />
        <input data-keystone-input="password" type="password" />
        <button type="submit">Sign in</button>
      </form>
      <button id="keystone-google-btn">Continue with Google</button>
      <button id="keystone-logout">Sign out</button>
    </div>
  );
}`;
  }, [selectedApp, keystoneUrl, callbackUrl]);

  const vueCode = useMemo(() => {
    if (!selectedApp) {
      return "<!-- Select an application to generate the connect code -->";
    }
    return `<template>
  <div>
    <form id="keystone-login-form">
      <input data-keystone-input="email" type="email" />
      <input data-keystone-input="password" type="password" />
      <button type="submit">Sign in</button>
    </form>
    <button id="keystone-google-btn">Continue with Google</button>
    <button id="keystone-logout">Sign out</button>
  </div>
</template>

<script setup>
// No imports needed. The global SDK is loaded from index.html:
// <script src="${keystoneUrl}/sdk/keystone-dropin.js"
//   data-keystone-client-id="${selectedApp.clientId}"
//   data-keystone-callback="${callbackUrl}"><\/script>
<\/script>`;
  }, [selectedApp, keystoneUrl, callbackUrl]);

  const codeExamples = {
    html: embedCode,
    react: reactCode,
    vue: vueCode,
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeExamples[activeTab]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const tabs = [
    { id: "html" as const, label: "HTML", icon: <FileCode className="w-3.5 h-3.5" /> },
    { id: "react" as const, label: "React", icon: <Code2 className="w-3.5 h-3.5" /> },
    { id: "vue" as const, label: "Vue", icon: <LayoutTemplate className="w-3.5 h-3.5" /> },
  ];

  const requirements = [
    { label: "Application selected", ok: Boolean(selectedApp) },
    { label: "Callback URL in Redirect URIs", ok: callbackOk },
    { label: "Project origin in Allowed Origins", ok: originOk },
    { label: "Application is active", ok: selectedApp?.isActive ?? false },
  ];

  const simpleCode = codeExamples[framework];

  const openTestLogin = () => {
    if (!selectedApp) return;
    const url = `${keystoneUrl}/sdk/test-login?client_id=${encodeURIComponent(selectedApp.clientId)}&callback=${encodeURIComponent(callbackUrl)}`;
    window.open(url, "keystone-test", "width=480,height=640");
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Connect a Project"
        description="Generate a drop-in auth script and wire Keystone into any website or app in minutes."
      />

      <div className={mode === "advanced" ? "hidden" : undefined}>
        <SectionCard
          title="Quick install"
          description="Choose your framework, pick an app, and copy one snippet."
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <Label className="text-[12px]">Framework</Label>
              <Select value={framework} onChange={(e) => setFramework(e.target.value as typeof framework)}>
                <option value="html">HTML / Vanilla JS</option>
                <option value="react">React</option>
                <option value="vue">Vue</option>
              </Select>
            </div>
            <div>
              <Label className="text-[12px]">Application</Label>
              <Select value={selectedAppId} onChange={(e) => setSelectedAppId(e.target.value)}>
                <option value="">Select an application</option>
                {apps.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label className="text-[12px]">Website URL</Label>
              <Input value={projectUrl} onChange={(e) => setProjectUrl(e.target.value)} placeholder="http://localhost:3000" />
            </div>
          </div>

          <CodeBlock code={simpleCode} language={framework === "html" ? "html" : framework === "vue" ? "vue" : "tsx"} showLineNumbers />

          <div className="flex flex-wrap items-center gap-3 mt-4">
            <Button size="sm" variant="secondary" onClick={handleCopy} disabled={!selectedApp}>
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied" : "Copy snippet"}
            </Button>
            <Button size="sm" onClick={openTestLogin} disabled={!selectedApp}>
              Test login
            </Button>
          </div>

          {!selectedApp && apps.length === 0 && (
            <Alert variant="info" className="mt-4 text-[12px]">
              Create an application first in the Applications section.
            </Alert>
          )}
        </SectionCard>
      </div>

      <Advanced mode={mode}>
      {/* Configuration */}
      <SectionCard
        title={
          <span className="flex items-center gap-2">
            <Rocket className="w-4 h-4 text-gold" />
            1. Configure integration
          </span>
        }
        description="Pick the application and tell us where it will be hosted."
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <p className="text-[11px] txt-muted mt-1">The public URL where your project is hosted.</p>
              </div>

              <div>
                <Label className="text-[12px]">Callback path</Label>
                <Input
                  value={callbackPath}
                  onChange={(e) => setCallbackPath(e.target.value)}
                  placeholder="/callback.html"
                />
                <p className="text-[11px] txt-muted mt-1">Where users land after OAuth providers (Google, etc.).</p>
              </div>

              <div className="flex flex-col justify-end">
                <div className="text-[12px] space-y-1">
                  <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-gold" />
                    <span className="txt-muted">Keystone URL:</span>
                    <code className="text-gold font-medium">{keystoneUrl}</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowRight className="w-3.5 h-3.5 text-gold" />
                    <span className="txt-muted">Callback URL:</span>
                    <code className="text-gold font-medium">{callbackUrl}</code>
                  </div>
                </div>
              </div>
            </div>

            {selectedApp && (
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Badge variant={selectedApp.isActive ? "success" : "warning"}>
                  {selectedApp.isActive ? "Active" : "Inactive"}
                </Badge>
                <Badge variant="default">{selectedApp.clientId}</Badge>
                {!callbackOk && (
                  <Badge variant="danger">Callback URL not in Redirect URIs</Badge>
                )}
                {!originOk && (
                  <Badge variant="danger">Origin not in Allowed Origins</Badge>
                )}
              </div>
            )}
          </div>

          <div className="bg-surface border border-theme/20 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 txt-head text-[13px] font-semibold">
              <Shield className="w-4 h-4 text-gold" />
              Requirements
            </div>
            <div className="space-y-2">
              {requirements.map((req) => (
                <div key={req.label} className="flex items-center gap-2 text-[12px]">
                  {req.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-zinc-400 shrink-0" />
                  )}
                  <span className={req.ok ? "txt-body" : "txt-muted"}>{req.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Generated code */}
      <SectionCard
        title={
          <span className="flex items-center gap-2">
            <Braces className="w-4 h-4 text-gold" />
            2. Add the code
          </span>
        }
        description="Copy the snippet for your framework and paste it into your project."
      >
        {selectedApp && !selectedApp.isActive && (
          <Alert variant="error" className="mb-4">
            This application is disabled. Enable it before using it in production.
          </Alert>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <Tabs tabs={tabs} active={activeTab} onChange={(id) => setActiveTab(id as CodeTab)} />
          <Button size="sm" variant="secondary" onClick={handleCopy} disabled={!selectedApp}>
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied" : "Copy snippet"}
          </Button>
        </div>

        <CodeBlock
          code={codeExamples[activeTab]}
          language={activeTab === "html" ? "html" : activeTab === "vue" ? "vue" : "tsx"}
          showLineNumbers
          className="mb-5"
        />

        <Alert variant="info" className="text-[12px]">
          Make sure your project URL is in the application&apos;s <strong>Allowed Origins</strong> and the callback URL is in{" "}
          <strong>Redirect URIs</strong>.{" "}
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className="inline-flex items-center gap-1 underline hover:text-gold"
          >
            Learn more <ExternalLink className="w-3 h-3" />
          </a>
        </Alert>
      </SectionCard>

      {/* Live preview */}
      <SectionCard
        title={
          <span className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-gold" />
            3. Live preview
          </span>
        }
        description="This is what your users will see once the SDK is wired."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card className="p-5 bg-surface border border-theme/20">
            <div className="space-y-3">
              <div className="text-center mb-4">
                <h4 className="text-[14px] font-semibold txt-head">Sign in to {selectedApp?.name ?? "your app"}</h4>
                <p className="text-[11px] txt-muted">Powered by Keystone</p>
              </div>
              <form className="space-y-2">
                <input
                  type="email"
                  placeholder="Email"
                  className="w-full px-3 py-2 rounded-lg bg-input border border-theme/30 text-[12px] outline-none"
                  readOnly
                />
                <input
                  type="password"
                  placeholder="Password"
                  className="w-full px-3 py-2 rounded-lg bg-input border border-theme/30 text-[12px] outline-none"
                  readOnly
                />
                <button
                  type="button"
                  className="w-full py-2 rounded-lg btn-gold text-white text-[12px] font-medium opacity-80"
                >
                  Sign in
                </button>
              </form>
              <button
                type="button"
                className="w-full py-2 rounded-lg border border-theme/30 bg-white text-[12px] font-medium flex items-center justify-center gap-2 opacity-80"
              >
                Continue with Google
              </button>
            </div>
          </Card>

          <div className="space-y-3">
            <p className="text-[13px] txt-body">
              The SDK automatically attaches to the form above because it uses the IDs and data attributes shown below.
              You do not need to write any JavaScript.
            </p>
            <div className="space-y-2">
              {[
                { id: "keystone-login-form", label: "Sign-in form" },
                { id: "keystone-register-form", label: "Sign-up form" },
                { id: "keystone-google-btn", label: "Google button" },
                { id: "keystone-logout", label: "Logout button" },
              ].map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between px-3 py-2 rounded-xl bg-surface border border-theme/20 text-[12px]"
                >
                  <code className="text-gold">#{item.id}</code>
                  <span className="txt-muted">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Integration flow */}
      <SectionCard
        title={
          <span className="flex items-center gap-2">
            <Info className="w-4 h-4 text-gold" />
            How it works
          </span>
        }
        description="Three simple steps between your users and Keystone."
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              step: "1",
              title: "User visits your project",
              desc: "The drop-in script loads from Keystone and scans the page for known IDs.",
              icon: <Globe className="w-5 h-5 text-gold" />,
            },
            {
              step: "2",
              title: "Keystone handles auth",
              desc: "Passwords, registration, and OAuth flows run through your Keystone instance.",
              icon: <Shield className="w-5 h-5 text-gold" />,
            },
            {
              step: "3",
              title: "Tokens are stored",
              desc: "Keystone returns a secure session cookie and updates the UI automatically.",
              icon: <Lock className="w-5 h-5 text-gold" />,
            },
          ].map((item, idx, arr) => (
            <div key={item.step} className="relative">
              <Card className="p-4 bg-surface border border-theme/20 h-full">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-gold uppercase tracking-wide">Step {item.step}</p>
                    <h4 className="text-[14px] font-semibold txt-head mt-0.5">{item.title}</h4>
                    <p className="text-[12px] txt-muted mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </Card>
              {idx < arr.length - 1 && (
                <div className="hidden md:flex absolute top-1/2 -right-2 transform -translate-y-1/2 translate-x-1/2 z-10">
                  <ChevronRight className="w-4 h-4 text-gold/50" />
                </div>
              )}
            </div>
          ))}
        </div>
      </SectionCard>

      <Advanced mode={mode}>
        {/* HTML reference */}
        <SectionCard
          title={
            <span className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-gold" />
              HTML reference
            </span>
          }
          description="Use these IDs and data attributes so the SDK can find your elements."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4 bg-surface border border-theme/20">
              <h4 className="text-[13px] font-semibold txt-head mb-3 flex items-center gap-2">
                <LayoutTemplate className="w-4 h-4 text-gold" />
                Form IDs
              </h4>
              <div className="space-y-3">
                {[
                  { id: "keystone-login-form", desc: "Sign-in form. Needs email and password inputs." },
                  { id: "keystone-register-form", desc: "Sign-up form. Needs username, email, and password inputs." },
                  { id: "keystone-google-btn", desc: "Button that starts Google OAuth sign-in." },
                  { id: "keystone-logout", desc: "Button that signs the user out." },
                ].map((item) => (
                  <div key={item.id} className="flex items-start gap-3">
                    <code className="text-[11px] text-gold shrink-0 mt-0.5">#{item.id}</code>
                    <p className="text-[12px] txt-muted leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4 bg-surface border border-theme/20">
              <h4 className="text-[13px] font-semibold txt-head mb-3 flex items-center gap-2">
                <Braces className="w-4 h-4 text-gold" />
                Data attributes
              </h4>
              <div className="space-y-3">
                {[
                  { attr: "data-keystone-input", desc: "Use on inputs: email, password, username, name." },
                  { attr: "data-keystone-field", desc: "Use on display elements: email, name, username. Auto-filled after login." },
                  { attr: "data-keystone-url", desc: "Your Keystone API base URL." },
                  { attr: "data-keystone-client-id", desc: "Public client ID for this application." },
                ].map((item) => (
                  <div key={item.attr} className="flex items-start gap-3">
                    <code className="text-[11px] text-gold shrink-0 mt-0.5">{item.attr}</code>
                    <p className="text-[12px] txt-muted leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </SectionCard>

        {/* Security note */}
        <Alert variant="info" className="text-[12px]">
          <div className="flex items-start gap-2">
            {showSecret ? <EyeOff className="w-4 h-4 shrink-0" /> : <Eye className="w-4 h-4 shrink-0" />}
            <div className="flex-1">
              <p className="font-medium">Never expose your client secret in browser code</p>
              <p className="mt-1">
                The drop-in SDK only needs the public <strong>client ID</strong>. Keep the client secret on your backend.
              </p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setShowSecret((s) => !s)} className="shrink-0">
              {showSecret ? "Hide" : "Show why"}
            </Button>
          </div>
          {showSecret && (
            <div className="mt-3 pt-3 border-t border-gold/20 text-[11px] txt-muted">
              The client secret is used for server-to-server communication (e.g., exchanging authorization codes).
              Putting it in HTML or JavaScript sent to the browser would let anyone steal it.
            </div>
          )}
        </Alert>
      </Advanced>
      </Advanced>
    </div>
  );
}

export const ConnectProjectPanel = memo(ConnectProjectPanelBase);
