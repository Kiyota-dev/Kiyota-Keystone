import { z } from "zod";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { eq, count } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db, initDb } from "../db/index.js";
import { users } from "../db/schema.js";
import { AuthenticationDomainService } from "../services/domain/authentication.js";
import { DrizzleUserRepository } from "../repositories/index.js";
import { validateDatabase, validateRedis, validateEmail, validateSms } from "../services/setup/validation.js";
import { createConfigWriter } from "../services/setup/configWriter.js";
import { getSetupToken, validateSetupToken } from "../services/setup/token.js";
import { queue } from "../services/queue/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SetupInitSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
  username: z.string().optional(),
});

const ValidateDatabaseSchema = z.object({
  databaseUrl: z.string().min(1),
});

const ValidateRedisSchema = z.object({
  redisUrl: z.string().min(1),
});

const ValidateEmailSchema = z.object({
  provider: z.enum(["none", "console", "smtp", "sendgrid", "mailgun"]),
  from: z.string().email(),
  smtpHost: z.string().optional(),
  smtpPort: z.coerce.number().optional(),
  smtpUser: z.string().optional(),
  smtpPass: z.string().optional(),
  smtpSecure: z.boolean().optional(),
  sendgridApiKey: z.string().optional(),
  mailgunApiKey: z.string().optional(),
  mailgunDomain: z.string().optional(),
  to: z.string().email(),
});

const ValidateSmsSchema = z.object({
  provider: z.enum(["none", "console", "twilio"]),
  twilioAccountSid: z.string().optional(),
  twilioAuthToken: z.string().optional(),
  twilioFromNumber: z.string().optional(),
  twilioMessagingServiceSid: z.string().optional(),
  to: z.string().min(1),
});

const SetupConfigSchema = z.object({
  env: z.record(z.string()),
});

async function hasNoUsers(): Promise<boolean> {
  if (!db) return true;
  const [result] = await db.select({ total: count() }).from(users);
  return (result?.total ?? 0) === 0;
}

async function ensureDbInitialized(reply: FastifyReply): Promise<boolean> {
  if (db) return true;
  try {
    const writer = createConfigWriter();
    const values = await writer.read();
    const databaseUrl = values.DATABASE_URL;
    if (!databaseUrl) {
      reply.status(400).send({ error: "DATABASE_URL is not configured. Apply configuration first.", code: "DATABASE_URL_MISSING" });
      return false;
    }
    process.env.DATABASE_URL = databaseUrl;
    initDb();
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    reply.status(500).send({ error: message, code: "DB_INIT_FAILED" });
    return false;
  }
}

function assertSetupToken(request: FastifyRequest, reply: FastifyReply): boolean {
  const token = request.headers["x-setup-token"] as string | undefined;
  if (!validateSetupToken(token)) {
    reply.status(401).send({ error: "Invalid or missing setup token" });
    return false;
  }
  return true;
}

export default async function setupRoutes(app: FastifyInstance) {
  app.get("/status", async () => {
    return {
      needsSetup: await hasNoUsers(),
      setupToken: Boolean(getSetupToken()),
    };
  });

  app.post("/validate/db", async (request: FastifyRequest, reply: FastifyReply) => {
    if (!assertSetupToken(request, reply)) return;
    const body = ValidateDatabaseSchema.parse(request.body);
    const result = await validateDatabase(body);
    if (!result.success) {
      return reply.status(result.error.statusCode || 400).send({ error: result.error.message, code: result.error.code });
    }
    return { ok: true };
  });

  app.post("/validate/redis", async (request: FastifyRequest, reply: FastifyReply) => {
    if (!assertSetupToken(request, reply)) return;
    const body = ValidateRedisSchema.parse(request.body);
    const result = await validateRedis(body);
    if (!result.success) {
      return reply.status(result.error.statusCode || 400).send({ error: result.error.message, code: result.error.code });
    }
    return { ok: true };
  });

  app.post("/validate/email", async (request: FastifyRequest, reply: FastifyReply) => {
    if (!assertSetupToken(request, reply)) return;
    const body = ValidateEmailSchema.parse(request.body);
    const { to, ...input } = body;
    const result = await validateEmail(input, to);
    if (!result.success) {
      return reply.status(result.error.statusCode || 400).send({ error: result.error.message, code: result.error.code });
    }
    return { ok: true };
  });

  app.post("/validate/sms", async (request: FastifyRequest, reply: FastifyReply) => {
    if (!assertSetupToken(request, reply)) return;
    const body = ValidateSmsSchema.parse(request.body);
    const { to, ...input } = body;
    const result = await validateSms(input, to);
    if (!result.success) {
      return reply.status(result.error.statusCode || 400).send({ error: result.error.message, code: result.error.code });
    }
    return { ok: true };
  });

  app.post("/config", async (request: FastifyRequest, reply: FastifyReply) => {
    if (!assertSetupToken(request, reply)) return;

    const body = SetupConfigSchema.parse(request.body);
    const writer = createConfigWriter();

    const backup = await writer.backup();
    if (!backup.success) {
      return reply.status(backup.error.statusCode || 500).send({ error: backup.error.message, code: backup.error.code });
    }

    const writeResult = await writer.write(body.env);
    if (!writeResult.success) {
      return reply.status(writeResult.error.statusCode || 500).send({ error: writeResult.error.message, code: writeResult.error.code });
    }

    return { ok: true, backupPath: backup.data || undefined };
  });

  app.post("/migrate", async (request: FastifyRequest, reply: FastifyReply) => {
    if (!assertSetupToken(request, reply)) return;
    if (!(await ensureDbInitialized(reply))) return;
    try {
      await migrate(db, { migrationsFolder: path.resolve(__dirname, "../db/migrations") });
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(500).send({ error: message, code: "MIGRATION_FAILED" });
    }
  });

  app.post("/restart", async (request: FastifyRequest, reply: FastifyReply) => {
    if (!assertSetupToken(request, reply)) return;
    reply.status(202).send({ ok: true, message: "Server is restarting" });
    try {
      await queue.close?.();
    } catch {
      // ignore
    }
    setTimeout(() => process.exit(0), 500);
  });

  app.post("/init", async (request: FastifyRequest, reply: FastifyReply) => {
    if (!assertSetupToken(request, reply)) return;
    if (!(await ensureDbInitialized(reply))) return;
    if (!(await hasNoUsers())) {
      return reply.status(403).send({ error: "Setup has already been completed" });
    }

    const body = SetupInitSchema.parse(request.body);
    const authService = new AuthenticationDomainService(new DrizzleUserRepository());
    const result = await authService.register({
      email: body.email,
      password: body.password,
      name: body.name,
      username:
        body.username ||
        body.email
          .split("@")[0]
          .toLowerCase()
          .replace(/[^a-z0-9_-]/g, "-")
          .slice(0, 32),
    });

    if (!result.success) {
      return reply.status(400).send({ error: result.error.message });
    }

    await db.update(users).set({ role: "owner" }).where(eq(users.id, result.data.user.id));

    return {
      user: {
        id: result.data.user.id,
        email: result.data.user.email,
        username: result.data.user.username,
        role: "owner",
      },
    };
  });
}
