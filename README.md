# Kiyota Keystone

> A provider-agnostic, API-first identity platform for Kiyota products and third-party applications.

Keystone is not a wrapper around another identity system. It is a standalone platform that authenticates users, issues signed tokens, enforces authorization, audits every security decision, and federates identities from any OIDC provider.

---

## What Keystone becomes

- **Identity Provider (IdP)** — OIDC/OAuth2 provider with JWKS discovery.
- **Authentication Service** — email/password, social login, magic links, WebAuthn/Passkeys, TOTP, SMS OTP.
- **Authorization Engine** — RBAC/ABAC permissions with `/v1/authz/check`.
- **Token Authority** — short-lived JWT access tokens, rotating refresh tokens, opaque API keys.
- **Machine Identity Manager** — scoped, rotatable, auditable service credentials.
- **Federation Broker** — delegate login to Google, GitHub, Azure, Okta, Keycloak, Zitadel, or any OIDC provider and issue Keystone tokens.
- **Audit & Compliance** — immutable audit log, event bus, webhooks, and anomaly detection.
- **Workflow Platform** — configurable post-auth workflows (assign roles, create orgs, send email, fire webhooks).

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Consumers                                       │
│   Web App    Mobile    CLI    Microservice    External SaaS             │
└──────┬───────┬─────────┬──────┬──────────────┬──────────────────────────┘
       │       │         │      │              │
       ▼       ▼         ▼      ▼              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Public SDK Layer                                   │
│            JS / React / Next.js / Python / CLI                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Kiyota Keystone                                 │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │              API-First Admin & Public APIs                      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │         Internal SDK (stable contracts)                         │   │
│  │  AuthenticationSdk │ IdentitySdk │ OrganizationSdk │ AuthzSdk   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │         Application Services (use cases / HTTP agnostic)        │   │
│  │  AuthenticationApplicationService │ OrganizationApplication... │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │         Domain Services (business rules)                        │   │
│  │  AuthenticationDomainService │ AuthorizationDomainService       │   │
│  │  IdentityDomainService       │ OrganizationDomainService        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │         Repositories (persistence abstraction)                  │   │
│  │  UserRepository │ OrganizationRepository │ ApplicationRepository │   │
│  │  IdentityRepository │ AuditRepository                         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐      │   │
│  │   Identity   │  │   Token      │  │    Authorization     │      │   │
│  │   Connectors │  │   Service    │  │    Engine            │      │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘      │   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐      │   │
│  │ Versioned    │  │   Secrets    │  │   Workflow Engine    │      │   │
│  │ Event Bus    │  │   Provider   │  │   + Background Queue │      │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘      │   │
│  ┌────────────────────────────────────────────────────────────┐    │   │
│  │  DI Container │ Plugin Registry │ ConfigurationService     │    │   │
│  └────────────────────────────────────────────────────────────┘    │   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
               ┌────────────────────┼────────────────────┐
               ▼                    ▼                    ▼
          PostgreSQL            Redis              External providers
```

---

## Design principles

### 1. Connectors are pure provider adapters

Identity connectors know only how to talk to an external provider:

- Build authorization URLs
- Exchange codes for tokens
- Validate identity tokens
- Retrieve and normalize profile information

They do **not** create users, link identities, issue Keystone tokens, or manage sessions. Those responsibilities live in higher-level services such as `FederationService` and `AuthenticationService`. This keeps connectors small, reusable, and easy to test.

### 2. Layered architecture: Application → Domain → Repository

Routes delegate to an **Application Layer** that executes use cases, which in turn delegate to **Domain Services** that encode business rules. Domain services depend on **Repository interfaces**, not on SQL or ORM details.

```
Routes → Application Services → Domain Services → Repositories
```

This keeps business logic independent of HTTP and makes future transports (CLI, gRPC, workers, GraphQL) straightforward.

### 3. Everything important emits a versioned event

The audit event bus emits structured events such as `user_registered`, `user_login`, `oauth_callback`, `api_key_created`, and `authz_check`.

Every event carries a version:

```json
{
  "type": "user.login",
  "version": 1,
  "timestamp": "2026-07-13T00:00:00Z",
  "payload": {
    "userId": "...",
    "ip": "...",
    "metadata": {}
  }
}
```

Versioned events let subscribers evolve independently without breaking integrations.

### 4. Long-running work belongs in a background queue

The in-process event bus is a fast starting point, but actions such as sending emails, delivering webhooks, running analytics, and executing workflow steps should move to a background job queue. Keystone ships with a BullMQ-backed queue that is used automatically when Redis is available (`KEYSTONE_QUEUE_PROVIDER=""` or `bullmq`), falling back to an in-process queue for local development.

### 5. Secrets are pluggable

Secrets management is abstracted so Keystone can store and rotate keys in different backends:

- `DatabaseSecretsProvider` — default, stores keys in PostgreSQL
- `EnvironmentSecretsProvider` — read from env vars
- `AWS KMS Provider`, `HashiCorp Vault Provider`, `Azure Key Vault Provider` — enterprise options (via plugin or future built-in providers)

The default provider handles JWT signing keys, encryption keys, password hashes, API keys, and client secrets with rotation support. JWT keys are rotated with a 24-hour grace period so tokens signed with the previous key remain valid.

### 6. Built for a plugin architecture

Keystone is designed to be extended without touching core code. The plugin registry can register:

- Identity providers and authentication methods
- Email and SMS providers
- Custom workflow steps
- Analytics, billing, and custom authorization policies

Load plugins at startup via `KEYSTONE_PLUGINS=./plugins/my-plugin.js` or call `app.registerPlugin(plugin)` at runtime. Each plugin exports a `KeystonePlugin` object with optional `connectors`, `emailProvider`, `smsProvider`, and `workflowSteps`.

### 7. Internal SDK layer

Routes, CLI commands, workers, and scheduled jobs share a stable internal client layer instead of calling low-level services directly:

```ts
import { getSdk } from "./sdk/index.js";

const sdk = getSdk();
const session = await sdk.authentication.login({ email, password });
const user = await sdk.identity.findUser(session.user.id);
const allowed = await sdk.authorization.hasPermission(role, resource, action);
const org = await sdk.organization.createOrganization(userId, { name: "Acme" });
```

The SDK exposes stable TypeScript interfaces (`AuthenticationSdk`, `IdentitySdk`, `OrganizationSdk`, `AuthorizationSdk`) while hiding the concrete application and domain service implementations.

---

## Advanced architecture patterns

### Dependency injection

A lightweight DI container wires repositories, domain services, and application services. The container is initialized when the app boots:

```ts
import { initializeContainer, getContainer } from "./di.js";

initializeContainer();
const users = getContainer().userRepository;
```

Services receive dependencies through constructors, making unit testing with mocked repositories straightforward.

### Repository abstraction

Domain services depend on repository interfaces such as `UserRepository`, `OrganizationRepository`, `ApplicationRepository`, `IdentityRepository`, and `AuditRepository`. Drizzle-based implementations live in `src/repositories/`, but the persistence layer can be swapped without touching business logic.

### Standardized results

Internal services return a uniform `Result<T>` type instead of throwing:

```ts
import { ok, err, type Result } from "./lib/result.js";

function findUser(id: string): Result<User> {
  if (!user) return err({ code: "NOT_FOUND", message: "User not found", statusCode: 404 });
  return ok(user);
}
```

This simplifies error handling and reduces duplicated try/catch logic.

### Configuration service

`ConfigurationService` centralizes loading, defaults, validation, and environment-specific overrides. Access runtime configuration through the container or via `config.get()`.

### Feature flags

Enable or disable functionality at runtime through `KEYSTONE_FEATURE_FLAGS`:

```bash
KEYSTONE_FEATURE_FLAGS=beta_oauth=true,experimental_workflows=false
```

Check flags in code:

```ts
const features = getContainer().features;
if (features.isEnabled("beta_oauth")) { /* ... */ }
```

---

## Stack

- **Runtime:** Fastify 5 + TypeScript
- **Database:** Drizzle ORM + `postgres`
- **Cache / rate limiting:** Redis (ioredis)
- **Tokens & JWKS:** `jose`
- **Validation:** `zod`
- **Password hashing:** `argon2id` with legacy `scrypt` verification
- **WebAuthn:** `@simplewebauthn/server`
- **Tracing:** OpenTelemetry

---

## Local development

### One-command setup (recommended)

From `Kiyota/Keystone`:

```bash
./install.sh       # installs backend + frontend deps + Playwright Chromium
```

Launch Keystone. `start.sh` will automatically start PostgreSQL and Redis via Docker if they are not already running. If no `.env` exists (or `DATABASE_URL` is missing), Keystone starts in **setup mode** and opens the browser wizard instead of the main API:

```bash
./start.sh         # starts backend/setup server + frontend together
```

The wizard guides you through:

1. Pasting the setup token printed in the server logs.
2. Configuring and testing PostgreSQL and Redis.
3. Setting public URLs and allowed origins.
4. Generating platform secrets (internal API key, encryption key).
5. Choosing and testing email and SMS providers.
6. Enabling optional identity connectors (Google, GitHub, Azure, Okta, Keycloak, Zitadel).
7. Creating the first owner account.

When finished, the wizard writes `.env`, runs migrations, and creates the owner. Restart the server if prompted; on the next boot the main Keystone API starts with the new configuration.

### Manual setup

If you prefer to manage each part separately:

1. Install backend dependencies: `npm install`
2. Install frontend dependencies: `cd frontend && npm install`
3. Start Postgres and Redis.
4. Copy `.env.example` to `.env` and fill in the required values:
   - `DATABASE_URL`
   - `REDIS_URL`
   - `AUTH_API_PUBLIC_URL`
   - `CLIENT_APP_URL`
   - `ALLOWED_ORIGINS`
   - `KEYSTONE_INTERNAL_API_KEY`
   - `KEYSTONE_ENCRYPTION_KEY` (optional in dev)
   - **Zitadel is optional.** If you want to use it, set `ZITADEL_DOMAIN`, `ZITADEL_CLIENT_ID`, and `ZITADEL_CLIENT_SECRET`.
   - To enable Google/GitHub/Azure/Okta/Keycloak federation, set their `*_CLIENT_ID` and `*_CLIENT_SECRET` variables.
5. Run migrations: `npm run db:migrate`
6. Start the backend: `npm run dev`
7. In another terminal, start the frontend: `cd frontend && npm run dev`

### Manual setup

If you prefer to manage each part separately:

1. Install backend dependencies: `npm install`
2. Install frontend dependencies: `cd frontend && npm install`
3. Run migrations: `npm run db:migrate`
4. Start the backend: `npm run dev`
5. In another terminal, start the frontend: `cd frontend && npm run dev`

### Running integration tests locally

Start test services with Docker Compose:

```bash
docker compose -f docker-compose.test.yml up -d
npm test
```

### Setup frontend E2E tests

The setup wizard lives in `frontend/` and is tested with Playwright. From the project root:

```bash
npm run test:all
```

Or run only the backend tests or only the E2E tests:

```bash
npm test                         # backend tests
cd frontend && npm run test:e2e  # Playwright E2E tests
```

---

## Building for production

```bash
npm ci
npm run build
npm start
```

`npm run build` compiles TypeScript and copies migration SQL files into `dist/db/migrations` so they are available at runtime.

---

## Key environment variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `AUTH_API_PUBLIC_URL` | Public URL used for discovery and redirects |
| `CLIENT_APP_URL` | Default redirect URL after login |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins |
| `KEYSTONE_INTERNAL_API_KEY` | Secret for service-to-service calls |
| `KEYSTONE_ENCRYPTION_KEY` | Master key for encrypted secrets (optional in dev) |
| `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` | RSA key pair for signing tokens (optional in dev) |
| `ZITADEL_DOMAIN` | Zitadel instance domain (optional connector) |
| `ZITADEL_CLIENT_ID` / `ZITADEL_CLIENT_SECRET` | Zitadel OIDC app credentials |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google connector credentials |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub connector credentials |
| `AZURE_CLIENT_ID` / `AZURE_CLIENT_SECRET` | Azure connector credentials |
| `OKTA_ISSUER` / `OKTA_CLIENT_ID` / `OKTA_CLIENT_SECRET` | Okta connector credentials |
| `KEYCLOAK_ISSUER` / `KEYCLOAK_CLIENT_ID` / `KEYCLOAK_CLIENT_SECRET` | Keycloak connector credentials |
| `EMAIL_PROVIDER` | `none`, `console`, `smtp`, `sendgrid`, or `mailgun` |
| `EMAIL_FROM` | Default sender address |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_SECURE` | SMTP settings |
| `SENDGRID_API_KEY` | SendGrid API key |
| `MAILGUN_API_KEY` / `MAILGUN_DOMAIN` | Mailgun settings |
| `SMS_PROVIDER` | `none`, `console`, or `twilio` |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM_NUMBER` / `TWILIO_MESSAGING_SERVICE_SID` | Twilio settings |
| `AUDIT_WEBHOOK_URL` | Webhook destination for audit events |
| `AUDIT_CONSOLE_EXPORT` | `true` to log audit events to console |
| `KEYSTONE_SEED_OWNER_EMAIL` | Default owner email for seeded organization |
| `KEYSTONE_SEED_OWNER_PASSWORD` | Password for the seed owner |
| `KEYSTONE_SECRETS_PROVIDER` | `database` (default) or `environment` |
| `KEYSTONE_QUEUE_PROVIDER` | `in-process`, `bullmq`, or empty to auto-select when Redis is available |
| `KEYSTONE_PLUGINS` | Comma-separated module paths of plugins to load at startup |
| `KEYSTONE_FEATURE_FLAGS` | Comma-separated `flag=true|false` runtime feature toggles |

---

## Endpoints

### Authentication

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Email/password signup (local password hashing) |
| POST | `/auth/login` | Email/password login |
| POST | `/auth/logout` | Revoke session |
| GET | `/auth/me` | Current user |
| POST | `/auth/refresh` | Rotate refresh token |
| GET | `/auth/oauth/:provider` | Start OAuth login (google, github, azure, okta, keycloak, zitadel) |
| GET | `/auth/callback/:provider` | OAuth callback |
| POST | `/auth/forgot-password` | Request password reset |
| POST | `/auth/reset-password` | Complete password reset |
| POST/GET/DELETE | `/auth/api-keys` | Personal API keys |
| GET | `/auth/validate` | Internal token/API-key validation |

### Federation

| Method | Path | Description |
|--------|------|-------------|
| GET | `/federation/providers` | List supported federation providers |
| GET | `/federation/:provider/start` | Start broker login through an external IdP |
| GET | `/federation/:provider/callback` | Broker callback; issues Keystone tokens |
| POST | `/federation/link` | Link an external identity to the current user |
| GET | `/federation/identities` | List linked external identities |

### OAuth2 / OIDC

| Method | Path | Description |
|--------|------|-------------|
| GET | `/oauth2/authorize` | Authorization endpoint (PKCE required) |
| POST | `/oauth2/token` | Token endpoint |
| GET | `/oauth2/userinfo` | UserInfo endpoint |
| POST | `/oauth2/revoke` | Token revocation |
| POST | `/oauth2/consent` | Grant or revoke consent |

### Admin (API-first)

| Method | Path | Description |
|--------|------|-------------|
| POST/GET | `/v1/admin/organizations` | Create / list organizations |
| GET | `/v1/admin/organizations/:id` | Organization details |
| POST/GET | `/v1/admin/organizations/:id/applications` | Create / list apps |
| PATCH | `/v1/admin/organizations/:id/applications/:appId` | Update app |
| POST/GET | `/v1/admin/organizations/:id/invites` | Invite / list invites |
| GET | `/v1/admin/organizations/:id/members` | List members |
| PATCH/DELETE | `/v1/admin/organizations/:id/members/:userId` | Update / remove member |
| GET | `/v1/admin/organizations/:id/users` | List users in org |
| GET/PATCH/DELETE | `/v1/admin/organizations/:id/users/:userId` | Manage user |
| GET | `/v1/admin/permissions` | List all permissions |
| GET/POST/DELETE | `/v1/admin/roles/:role/permissions` | Manage role permissions |
| GET/DELETE | `/v1/admin/organizations/:id/api-keys` | Org-scoped API keys |
| GET | `/v1/admin/organizations/:id/audit-logs` | Paginated audit logs |

### Discovery

| Method | Path | Description |
|--------|------|-------------|
| GET | `/.well-known/openid-configuration` | OIDC discovery document |
| GET | `/.well-known/jwks.json` | Public keys for token verification |
| GET | `/health` | Health check |
| GET | `/metrics` | Prometheus metrics |
| GET | `/documentation` | OpenAPI/Swagger UI |

---

## CLI

```bash
# Rotate the active JWT signing key
npx keystone secrets:rotate

# Generate a JWT key pair for env vars
npx keystone keys:create

# List active JWT signing keys
npx keystone keys:list

# Run migrations
npx keystone migrate

# Validate required configuration
npx keystone config:validate

# Create the first platform owner
npx keystone user:create --email admin@example.com --password 'Str0ngP@ss!' --role owner

# Create an organization from the command line
npx keystone org:create --name "Acme" --owner-email admin@example.com
```

---

## Security non-negotiables

- Passwords are never stored in plaintext.
- Tokens and secrets are hashed at rest.
- JWTs are signed with RS256 and keys are rotatable.
- Rate limiting is applied to every public endpoint.
- Every authentication decision is audited.
- Cookies use `HttpOnly`, `Secure`, and `SameSite`.
- OAuth2 public clients must use PKCE.

---

## License

MIT — Kiyota engineering.
