import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "./api.ts";
import Wizard from "./Wizard.tsx";
import Dashboard from "./Dashboard.tsx";
import { Card } from "./components/ui/Card.tsx";
import { Alert } from "./components/ui/Alert.tsx";
import { ErrorBoundary } from "./components/ui/ErrorBoundary.tsx";

export default function App() {
  const [status, setStatus] = useState<{ needsSetup: boolean; setupToken: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getStatus()
      .then((s) => {
        setStatus(s);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
  }, []);

  if (!loading && !error && !status?.needsSetup) {
    return (
      <ErrorBoundary>
        <Dashboard />
      </ErrorBoundary>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <Card variant="glass" className="w-full max-w-lg p-6 md:p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl btn-gold flex items-center justify-center">
            <span className="text-lg font-bold">K</span>
          </div>
          <h1 className="text-2xl font-semibold txt-head">Keystone Setup</h1>
        </div>

        {loading && (
          <div className="py-10 flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="w-7 h-7 animate-spin text-gold" />
            <p className="text-[14px]">Checking installation status…</p>
          </div>
        )}

        {!loading && error && (
          <div className="py-2">
            <Alert variant="error" className="mb-4">
              Unable to reach the Keystone API: {error}
            </Alert>
            <p className="text-[13px] txt-muted">
              Make sure the Keystone server is running and the API URL is configured correctly.
            </p>
          </div>
        )}

        {!loading && !error && status?.needsSetup && <Wizard />}
      </Card>
    </div>
  );
}
