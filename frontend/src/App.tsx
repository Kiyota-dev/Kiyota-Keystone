import { useEffect, useState } from "react";
import { api } from "./api.ts";
import Wizard from "./Wizard.tsx";

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

  if (loading) {
    return (
      <div className="card">
        <h1>Keystone Setup</h1>
        <p className="lead">Checking installation status…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <h1>Keystone Setup</h1>
        <p className="error">Unable to reach the Keystone API: {error}</p>
      </div>
    );
  }

  if (!status?.needsSetup) {
    return (
      <div className="card">
        <h1>Keystone is ready</h1>
        <p className="lead">Setup has already been completed. Sign in through your application.</p>
      </div>
    );
  }

  return <Wizard />;
}
