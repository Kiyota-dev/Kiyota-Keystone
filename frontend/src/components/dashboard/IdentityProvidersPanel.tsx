import { Plug } from "lucide-react";
import { Card } from "../ui/Card.tsx";
import { Badge } from "../ui/Badge.tsx";
import { PageHeader } from "../ui/PageHeader.tsx";
import { PanelWrapper } from "./PanelWrapper.tsx";

interface Provider {
  type: string;
  name: string;
  configured: boolean;
}

interface IdentityProvidersPanelProps {
  state: { data: { providers: Provider[] } | null; loading: boolean; error: string | null };
}

export function IdentityProvidersPanel({ state }: IdentityProvidersPanelProps) {
  const providers = state.data?.providers ?? [];

  return (
    <>
      <PageHeader
        title="Identity Providers"
        description="Configured social and enterprise identity connectors."
      />
      <PanelWrapper state={state} loadingMessage="Loading identity providers…" errorTitle="Unable to load identity providers">
        <Card variant="glass" className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-semibold txt-head flex items-center gap-2">
              <Plug className="w-4 h-4 text-gold" />
              Identity Providers
            </h3>
            <span className="text-[11px] txt-muted">
              {providers.filter((p) => p.configured).length} of {providers.length} configured
            </span>
          </div>

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

          <div className="mt-4 p-3 rounded-xl bg-surface border border-theme/20">
            <p className="text-[12px] txt-muted">
              Configure providers in the setup wizard or by setting environment variables such as{" "}
              <code className="font-mono text-gold">GOOGLE_CLIENT_ID</code> and{" "}
              <code className="font-mono text-gold">GOOGLE_CLIENT_SECRET</code>. Users can then sign in
              through the federation endpoints.
            </p>
          </div>
        </Card>
      </PanelWrapper>
    </>
  );
}
