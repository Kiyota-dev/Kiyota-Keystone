import { useState } from "react";
import { api } from "./api.ts";
import { initialState, type WizardState, type EmailProvider, type SmsProvider } from "./types.ts";

const STEPS = [
  "Token",
  "Infrastructure",
  "URLs",
  "Secrets",
  "Email",
  "SMS",
  "Connectors",
  "Review",
  "Owner",
  "Done",
];

function mask(value: string): string {
  return value ? "•".repeat(Math.min(value.length, 16)) : "(empty)";
}

function generateId(len = 32): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}

export default function Wizard() {
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>(initialState);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [needsRestart, setNeedsRestart] = useState(false);
  const [setupToken, setSetupToken] = useState(() => localStorage.getItem("keystone-setup-token") || "");

  const update = <K extends keyof WizardState>(section: K, values: Partial<WizardState[K]>) => {
    setState((prev) => ({ ...prev, [section]: { ...prev[section], ...values } }));
  };

  const setErrorMessage = (err: unknown) => {
    setError(err instanceof Error ? err.message : String(err));
  };

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const validateDatabase = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.validateDatabase({ databaseUrl: state.infrastructure.databaseUrl });
      setSuccess("Database connection successful");
      next();
    } catch (err) {
      setErrorMessage(err);
    } finally {
      setBusy(false);
    }
  };

  const validateRedis = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.validateRedis({ redisUrl: state.infrastructure.redisUrl });
      setSuccess("Redis connection successful");
      next();
    } catch (err) {
      setErrorMessage(err);
    } finally {
      setBusy(false);
    }
  };

  const generateSecrets = () => {
    update("secrets", {
      internalApiKey: generateId(64),
      encryptionKey: generateId(32),
      jwtPrivateKey: "",
      jwtPublicKey: "",
      autoGenerate: true,
    });
    setSuccess("Secrets generated");
  };

  const validateEmail = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.validateEmail({
        provider: state.email.provider,
        from: state.email.from,
        smtpHost: state.email.smtpHost,
        smtpPort: state.email.smtpPort,
        smtpUser: state.email.smtpUser,
        smtpPass: state.email.smtpPass,
        smtpSecure: state.email.smtpSecure,
        sendgridApiKey: state.email.sendgridApiKey,
        mailgunApiKey: state.email.mailgunApiKey,
        mailgunDomain: state.email.mailgunDomain,
        to: state.owner.email || "test@example.com",
      });
      setSuccess("Test email sent successfully");
    } catch (err) {
      setErrorMessage(err);
    } finally {
      setBusy(false);
    }
  };

  const validateSms = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.validateSms({
        provider: state.sms.provider,
        twilioAccountSid: state.sms.twilioAccountSid,
        twilioAuthToken: state.sms.twilioAuthToken,
        twilioFromNumber: state.sms.twilioFromNumber,
        twilioMessagingServiceSid: state.sms.twilioMessagingServiceSid,
        to: "+1234567890",
      });
      setSuccess("Test SMS sent successfully");
    } catch (err) {
      setErrorMessage(err);
    } finally {
      setBusy(false);
    }
  };

  const buildEnv = (): Record<string, string> => {
    const env: Record<string, string> = {
      DATABASE_URL: state.infrastructure.databaseUrl,
      REDIS_URL: state.infrastructure.redisUrl,
      AUTH_API_PUBLIC_URL: state.urls.authApiPublicUrl,
      CLIENT_APP_URL: state.urls.clientAppUrl,
      ALLOWED_ORIGINS: state.urls.allowedOrigins,
      KEYSTONE_INTERNAL_API_KEY: state.secrets.internalApiKey,
      KEYSTONE_ENCRYPTION_KEY: state.secrets.encryptionKey,
      EMAIL_PROVIDER: state.email.provider,
      EMAIL_FROM: state.email.from,
      SMS_PROVIDER: state.sms.provider,
    };

    if (state.secrets.jwtPrivateKey) env.JWT_PRIVATE_KEY = state.secrets.jwtPrivateKey;
    if (state.secrets.jwtPublicKey) env.JWT_PUBLIC_KEY = state.secrets.jwtPublicKey;

    if (state.email.provider === "smtp") {
      env.SMTP_HOST = state.email.smtpHost;
      env.SMTP_PORT = String(state.email.smtpPort);
      env.SMTP_USER = state.email.smtpUser;
      env.SMTP_PASS = state.email.smtpPass;
      env.SMTP_SECURE = String(state.email.smtpSecure);
    } else if (state.email.provider === "sendgrid") {
      env.SENDGRID_API_KEY = state.email.sendgridApiKey;
    } else if (state.email.provider === "mailgun") {
      env.MAILGUN_API_KEY = state.email.mailgunApiKey;
      env.MAILGUN_DOMAIN = state.email.mailgunDomain;
    }

    if (state.sms.provider === "twilio") {
      env.TWILIO_ACCOUNT_SID = state.sms.twilioAccountSid;
      env.TWILIO_AUTH_TOKEN = state.sms.twilioAuthToken;
      env.TWILIO_FROM_NUMBER = state.sms.twilioFromNumber;
      env.TWILIO_MESSAGING_SERVICE_SID = state.sms.twilioMessagingServiceSid;
    }

    const connectors: [keyof WizardState["connectors"], string, string?][] = [
      ["google", "GOOGLE", undefined],
      ["github", "GITHUB", undefined],
      ["azure", "AZURE", undefined],
      ["okta", "OKTA", "ISSUER"],
      ["keycloak", "KEYCLOAK", "ISSUER"],
      ["zitadel", "ZITADEL", "DOMAIN"],
    ];

    for (const [key, prefix, extra] of connectors) {
      const cfg = state.connectors[key];
      if (cfg.enabled) {
        env[`${prefix}_CLIENT_ID`] = cfg.clientId;
        env[`${prefix}_CLIENT_SECRET`] = cfg.clientSecret;
        if (extra && "issuer" in cfg && cfg.issuer) env[`${prefix}_${extra}`] = cfg.issuer;
        if (extra && "domain" in cfg && cfg.domain) env[`${prefix}_${extra}`] = cfg.domain;
      }
    }

    return env;
  };

  const apply = async () => {
    setBusy(true);
    setError(null);
    try {
      const env = buildEnv();
      await api.applyConfig({ env });
      await api.runMigrations();
      setNeedsRestart(true);
      next();
    } catch (err) {
      setErrorMessage(err);
    } finally {
      setBusy(false);
    }
  };

  const createOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.init({
        email: state.owner.email,
        password: state.owner.password,
        name: state.owner.name,
      });
      next();
    } catch (err) {
      setErrorMessage(err);
    } finally {
      setBusy(false);
    }
  };

  const restart = async () => {
    setBusy(true);
    try {
      await api.restart();
    } catch {
      // The request may fail because the server is restarting.
    } finally {
      setBusy(false);
    }
  };

  const renderTokenStep = () => (
    <>
      <p className="lead">Enter the setup token shown in the server logs to continue.</p>
      <label htmlFor="token">Setup token</label>
      <input
        id="token"
        type="password"
        value={setupToken}
        onChange={(e) => {
          const value = e.target.value.trim();
          setSetupToken(value);
          localStorage.setItem("keystone-setup-token", value);
        }}
        placeholder="paste-token-here"
      />
      <button onClick={next} disabled={!setupToken}>
        Continue
      </button>
    </>
  );

  const renderInfrastructureStep = () => (
    <>
      <p className="lead">Configure PostgreSQL and Redis. Test each connection before continuing.</p>
      <label htmlFor="databaseUrl">Database URL</label>
      <input
        id="databaseUrl"
        type="text"
        value={state.infrastructure.databaseUrl}
        onChange={(e) => update("infrastructure", { databaseUrl: e.target.value })}
      />

      <label htmlFor="redisUrl">Redis URL</label>
      <input
        id="redisUrl"
        type="text"
        value={state.infrastructure.redisUrl}
        onChange={(e) => update("infrastructure", { redisUrl: e.target.value })}
      />

      <div className="actions">
        <button onClick={validateDatabase} disabled={busy}>
          {busy ? "Testing…" : "Test database"}
        </button>
        <button onClick={validateRedis} disabled={busy}>
          {busy ? "Testing…" : "Test Redis"}
        </button>
      </div>
    </>
  );

  const renderUrlsStep = () => (
    <>
      <p className="lead">Set the public URLs Keystone will use.</p>
      <label htmlFor="authApiPublicUrl">Auth API public URL</label>
      <input
        id="authApiPublicUrl"
        type="url"
        value={state.urls.authApiPublicUrl}
        onChange={(e) => update("urls", { authApiPublicUrl: e.target.value })}
      />

      <label htmlFor="clientAppUrl">Client app URL</label>
      <input
        id="clientAppUrl"
        type="url"
        value={state.urls.clientAppUrl}
        onChange={(e) => update("urls", { clientAppUrl: e.target.value })}
      />

      <label htmlFor="allowedOrigins">Allowed CORS origins (comma-separated)</label>
      <input
        id="allowedOrigins"
        type="text"
        value={state.urls.allowedOrigins}
        onChange={(e) => update("urls", { allowedOrigins: e.target.value })}
      />

      <button onClick={next}>Continue</button>
    </>
  );

  const renderSecretsStep = () => (
    <>
      <p className="lead">Generate secure platform secrets. They are masked in the review step.</p>
      <label>
        <input
          type="checkbox"
          checked={state.secrets.autoGenerate}
          onChange={(e) => update("secrets", { autoGenerate: e.target.checked })}
        />{" "}
        Auto-generate secrets
      </label>

      {state.secrets.autoGenerate && (
        <>
          <button onClick={generateSecrets} disabled={busy}>
            Generate secrets
          </button>
          {state.secrets.internalApiKey && (
            <p className="success">Secrets generated and will be written on apply.</p>
          )}
        </>
      )}

      {!state.secrets.autoGenerate && (
        <>
          <label htmlFor="internalApiKey">Internal API key</label>
          <input
            id="internalApiKey"
            type="password"
            value={state.secrets.internalApiKey}
            onChange={(e) => update("secrets", { internalApiKey: e.target.value })}
          />

          <label htmlFor="encryptionKey">Encryption key</label>
          <input
            id="encryptionKey"
            type="password"
            value={state.secrets.encryptionKey}
            onChange={(e) => update("secrets", { encryptionKey: e.target.value })}
          />
        </>
      )}

      <button onClick={next} disabled={!state.secrets.internalApiKey || !state.secrets.encryptionKey}>
        Continue
      </button>
    </>
  );

  const renderEmailStep = () => (
    <>
      <p className="lead">Choose how Keystone sends emails.</p>
      <label htmlFor="emailProvider">Email provider</label>
      <select
        id="emailProvider"
        value={state.email.provider}
        onChange={(e) => update("email", { provider: e.target.value as EmailProvider })}
      >
        <option value="none">None</option>
        <option value="console">Console (development)</option>
        <option value="smtp">SMTP</option>
        <option value="sendgrid">SendGrid</option>
        <option value="mailgun">Mailgun</option>
      </select>

      <label htmlFor="emailFrom">From address</label>
      <input
        id="emailFrom"
        type="email"
        value={state.email.from}
        onChange={(e) => update("email", { from: e.target.value })}
      />

      {state.email.provider === "smtp" && (
        <>
          <label htmlFor="smtpHost">SMTP host</label>
          <input
            id="smtpHost"
            type="text"
            value={state.email.smtpHost}
            onChange={(e) => update("email", { smtpHost: e.target.value })}
          />
          <label htmlFor="smtpPort">SMTP port</label>
          <input
            id="smtpPort"
            type="number"
            value={state.email.smtpPort}
            onChange={(e) => update("email", { smtpPort: Number(e.target.value) })}
          />
          <label htmlFor="smtpUser">SMTP user</label>
          <input
            id="smtpUser"
            type="text"
            value={state.email.smtpUser}
            onChange={(e) => update("email", { smtpUser: e.target.value })}
          />
          <label htmlFor="smtpPass">SMTP password</label>
          <input
            id="smtpPass"
            type="password"
            value={state.email.smtpPass}
            onChange={(e) => update("email", { smtpPass: e.target.value })}
          />
          <label>
            <input
              type="checkbox"
              checked={state.email.smtpSecure}
              onChange={(e) => update("email", { smtpSecure: e.target.checked })}
            />{" "}
            Use TLS
          </label>
        </>
      )}

      {state.email.provider === "sendgrid" && (
        <>
          <label htmlFor="sendgridApiKey">SendGrid API key</label>
          <input
            id="sendgridApiKey"
            type="password"
            value={state.email.sendgridApiKey}
            onChange={(e) => update("email", { sendgridApiKey: e.target.value })}
          />
        </>
      )}

      {state.email.provider === "mailgun" && (
        <>
          <label htmlFor="mailgunApiKey">Mailgun API key</label>
          <input
            id="mailgunApiKey"
            type="password"
            value={state.email.mailgunApiKey}
            onChange={(e) => update("email", { mailgunApiKey: e.target.value })}
          />
          <label htmlFor="mailgunDomain">Mailgun domain</label>
          <input
            id="mailgunDomain"
            type="text"
            value={state.email.mailgunDomain}
            onChange={(e) => update("email", { mailgunDomain: e.target.value })}
          />
        </>
      )}

      <div className="actions">
        <button onClick={validateEmail} disabled={busy || state.email.provider === "none"}>
          {busy ? "Sending…" : "Send test email"}
        </button>
        <button onClick={next}>Continue</button>
      </div>
    </>
  );

  const renderSmsStep = () => (
    <>
      <p className="lead">Choose how Keystone sends SMS messages.</p>
      <label htmlFor="smsProvider">SMS provider</label>
      <select
        id="smsProvider"
        value={state.sms.provider}
        onChange={(e) => update("sms", { provider: e.target.value as SmsProvider })}
      >
        <option value="none">None</option>
        <option value="console">Console (development)</option>
        <option value="twilio">Twilio</option>
      </select>

      {state.sms.provider === "twilio" && (
        <>
          <label htmlFor="twilioAccountSid">Account SID</label>
          <input
            id="twilioAccountSid"
            type="text"
            value={state.sms.twilioAccountSid}
            onChange={(e) => update("sms", { twilioAccountSid: e.target.value })}
          />
          <label htmlFor="twilioAuthToken">Auth token</label>
          <input
            id="twilioAuthToken"
            type="password"
            value={state.sms.twilioAuthToken}
            onChange={(e) => update("sms", { twilioAuthToken: e.target.value })}
          />
          <label htmlFor="twilioFromNumber">From number</label>
          <input
            id="twilioFromNumber"
            type="text"
            value={state.sms.twilioFromNumber}
            onChange={(e) => update("sms", { twilioFromNumber: e.target.value })}
          />
          <label htmlFor="twilioMessagingServiceSid">Messaging service SID</label>
          <input
            id="twilioMessagingServiceSid"
            type="text"
            value={state.sms.twilioMessagingServiceSid}
            onChange={(e) => update("sms", { twilioMessagingServiceSid: e.target.value })}
          />
        </>
      )}

      <div className="actions">
        <button onClick={validateSms} disabled={busy || state.sms.provider === "none"}>
          {busy ? "Sending…" : "Send test SMS"}
        </button>
        <button onClick={next}>Continue</button>
      </div>
    </>
  );

  const renderConnectorsStep = () => {
    const toggle = (key: keyof WizardState["connectors"]) => {
      setState((prev) => ({
        ...prev,
        connectors: {
          ...prev.connectors,
          [key]: { ...prev.connectors[key], enabled: !prev.connectors[key].enabled },
        },
      }));
    };

    const updateConnector = (key: keyof WizardState["connectors"], field: string, value: string) => {
      setState((prev) => ({
        ...prev,
        connectors: {
          ...prev.connectors,
          [key]: { ...prev.connectors[key], [field]: value },
        },
      }));
    };

    const connectorCard = (key: keyof WizardState["connectors"], label: string, extra?: string) => {
      const cfg = state.connectors[key];
      return (
        <div key={key} className="connector-card">
          <label className="connector-header">
            <input type="checkbox" checked={cfg.enabled} onChange={() => toggle(key)} />
            <strong>{label}</strong>
          </label>
          {cfg.enabled && (
            <div className="connector-fields">
              <label>Client ID</label>
              <input
                type="text"
                value={cfg.clientId}
                onChange={(e) => updateConnector(key, "clientId", e.target.value)}
              />
              <label>Client secret</label>
              <input
                type="password"
                value={cfg.clientSecret}
                onChange={(e) => updateConnector(key, "clientSecret", e.target.value)}
              />
              {extra && (
                <>
                  <label>{extra === "issuer" ? "Issuer" : "Domain"}</label>
                  <input
                    type="text"
                    value={(cfg as unknown as Record<string, string>)[extra]}
                    onChange={(e) => updateConnector(key, extra, e.target.value)}
                  />
                </>
              )}
            </div>
          )}
        </div>
      );
    };

    return (
      <>
        <p className="lead">Enable optional identity connectors. All are optional.</p>
        {connectorCard("google", "Google")}
        {connectorCard("github", "GitHub")}
        {connectorCard("azure", "Azure AD")}
        {connectorCard("okta", "Okta", "issuer")}
        {connectorCard("keycloak", "Keycloak", "issuer")}
        {connectorCard("zitadel", "Zitadel", "domain")}
        <button onClick={next}>Continue</button>
      </>
    );
  };

  const renderOwnerStep = () => (
    <>
      <p className="lead">Create the first platform owner account.</p>
      <form onSubmit={createOwner}>
        <label htmlFor="ownerName">Full name (optional)</label>
        <input
          id="ownerName"
          type="text"
          value={state.owner.name}
          onChange={(e) => update("owner", { name: e.target.value })}
        />

        <label htmlFor="ownerEmail">Email address</label>
        <input
          id="ownerEmail"
          type="email"
          required
          value={state.owner.email}
          onChange={(e) => update("owner", { email: e.target.value })}
        />

        <label htmlFor="ownerPassword">Password</label>
        <input
          id="ownerPassword"
          type="password"
          required
          minLength={8}
          value={state.owner.password}
          onChange={(e) => update("owner", { password: e.target.value })}
        />

        <button type="submit" disabled={busy}>
          {busy ? "Creating…" : "Create owner account"}
        </button>
      </form>
    </>
  );

  const renderReviewStep = () => {
    const env = buildEnv();
    return (
      <>
        <p className="lead">Review the configuration before applying.</p>
        <div className="review">
          {Object.entries(env).map(([key, value]) => (
            <div key={key} className="review-row">
              <span className="review-key">{key}</span>
              <span className="review-value">{mask(value)}</span>
            </div>
          ))}
        </div>
        <div className="actions">
          <button onClick={back}>Back</button>
          <button onClick={apply} disabled={busy}>
            {busy ? "Applying…" : "Apply configuration"}
          </button>
        </div>
      </>
    );
  };

  const renderDoneStep = () => (
    <>
      <p className="success">Setup complete. Owner account created for {state.owner.email}.</p>
      {needsRestart ? (
        <>
          <p className="lead">
            Keystone must restart to load the new database configuration.
          </p>
          <button onClick={restart} disabled={busy}>
            {busy ? "Restarting…" : "Restart server"}
          </button>
        </>
      ) : (
        <p className="lead">You can now sign in to the Administration Portal.</p>
      )}
    </>
  );

  const stepRenderers: Record<number, () => React.ReactNode> = {
    0: renderTokenStep,
    1: renderInfrastructureStep,
    2: renderUrlsStep,
    3: renderSecretsStep,
    4: renderEmailStep,
    5: renderSmsStep,
    6: renderConnectorsStep,
    7: renderReviewStep,
    8: renderOwnerStep,
    9: renderDoneStep,
  };

  return (
    <div className="card">
      <h1>Welcome to Keystone</h1>
      <p className="lead">Configure your identity platform in a few steps.</p>

      <div className="steps">
        {STEPS.map((label, idx) => (
          <div key={label} className="step">
            <span
              className={`step-dot ${idx === step ? "active" : idx < step ? "done" : ""}`}
            >
              {idx < step ? "✓" : idx + 1}
            </span>
            <span>{label}</span>
          </div>
        ))}
      </div>

      {success && <p className="success">{success}</p>}
      {error && <p className="error">{error}</p>}

      <div className="step-content">{stepRenderers[step]()}</div>

      {step > 0 && step < 9 && step !== 7 && (
        <button className="secondary" onClick={back} disabled={busy}>
          Back
        </button>
      )}
    </div>
  );
}
