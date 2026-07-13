import { z } from "zod";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { eq, count } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { AuthenticationDomainService } from "../services/domain/authentication.js";
import { DrizzleUserRepository } from "../repositories/index.js";

const SetupInitSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
  username: z.string().optional(),
});

async function hasNoUsers(): Promise<boolean> {
  const [result] = await db.select({ total: count() }).from(users);
  return (result?.total ?? 0) === 0;
}

export default async function setupRoutes(app: FastifyInstance) {
  app.get("/status", async () => {
    return { needsSetup: await hasNoUsers() };
  });

  app.post("/init", async (request: FastifyRequest, reply: FastifyReply) => {
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

    // Promote the first user to the platform owner.
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
