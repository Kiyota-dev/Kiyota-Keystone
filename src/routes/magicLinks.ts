import { z } from "zod";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { findUserByEmail } from "../services/users.js";
import {
  generateMagicLink,
  storeMagicLink,
  consumeMagicLink,
  magicLinkExpiresAt,
} from "../services/magicLinks.js";
import { createTokenSet } from "../services/tokens.js";
import { fingerprintFromRequest, recordDevice } from "../services/devices.js";
import { setSessionCookies } from "../plugins/auth.js";
import { toPublicUser } from "../types.js";

const SendSchema = z.object({
  email: z.string().email(),
});

export default async function magicLinkRoutes(app: FastifyInstance) {
  app.post("/magic-link/send", async (request, reply) => {
    const body = SendSchema.parse(request.body);
    const user = await findUserByEmail(body.email);
    if (!user) {
      return reply.status(200).send({ success: true });
    }

    const { token, tokenHash } = generateMagicLink();
    await storeMagicLink(user.id, tokenHash, magicLinkExpiresAt());

    await request.audit("magic_link_sent", { userId: user.id });

    return { success: true, token };
  });

  app.get("/magic-link/verify", async (request: FastifyRequest, reply) => {
    const query = request.query as { token?: string };
    if (!query.token) {
      return reply.status(400).send({ error: "Missing token" });
    }

    const user = await consumeMagicLink(query.token);
    if (!user) {
      return reply.status(400).send({ error: "Invalid or expired token" });
    }

    const fingerprint = fingerprintFromRequest(request);
    await recordDevice(user.id, fingerprint, request.ip, request.headers["user-agent"]);

    const tokens = await createTokenSet(
      user,
      request.ip,
      request.headers["user-agent"],
      {},
      fingerprint
    );
    setSessionCookies(reply, tokens.accessToken, tokens.refreshToken);

    await request.audit("magic_link_verified", { userId: user.id });

    return { user: toPublicUser(user) };
  });
}
