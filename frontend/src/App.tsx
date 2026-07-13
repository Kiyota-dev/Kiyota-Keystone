import { useEffect, useState } from "react";
import { api } from "./api.ts";

export default function App() {
  const [status, setStatus] = useState<{ needsSetup: boolean } | null>(null);
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

  return <SetupWizard />;
}

function SetupWizard() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.init({ email, password, name });
      setCreated(true);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <h1>Welcome to Keystone</h1>
      <p className="lead">Create the platform owner account to finish installation.</p>

      <div className="step">
        <span className={`step-dot ${step >= 1 ? "done" : ""}`}>1</span>
        <span>Connect to Keystone</span>
      </div>
      <div className="step">
        <span className={`step-dot ${step === 2 ? "active" : step > 2 ? "done" : ""}`}>2</span>
        <span>Create owner account</span>
      </div>
      <div className="step">
        <span className={`step-dot ${step === 3 ? "active" : ""}`}>3</span>
        <span>Done</span>
      </div>

      {step === 2 && !created && (
        <form onSubmit={submit}>
          <label htmlFor="name">Full name (optional)</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ada Lovelace"
          />

          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="owner@example.com"
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />

          {error && <p className="error">{error}</p>}

          <button type="submit" disabled={busy}>
            {busy ? "Creating account…" : "Create owner account"}
          </button>
        </form>
      )}

      {created && (
        <>
          <p className="success">
            Owner account created for <strong>{email}</strong>.
          </p>
          <p className="lead">You can now close this wizard and sign in to Keystone.</p>
        </>
      )}
    </div>
  );
}
