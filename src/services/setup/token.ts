import crypto from "node:crypto";

const SETUP_TOKEN_ENV = "KEYSTONE_SETUP_TOKEN";

let generatedToken: string | null = null;

export function getSetupToken(): string | undefined {
  return process.env[SETUP_TOKEN_ENV] || generatedToken || undefined;
}

export function generateSetupToken(): string {
  if (!generatedToken) {
    generatedToken = crypto.randomBytes(32).toString("hex");
  }
  return generatedToken;
}

export function validateSetupToken(token: string | undefined): boolean {
  if (!token) return false;
  const expected = getSetupToken();
  if (!expected) return false;
  if (token.length !== expected.length) {
    console.log(`[debug] token length mismatch: sent=${token.length} expected=${expected.length}`);
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

export function printSetupToken(): void {
  const token = getSetupToken();
  if (token) {
    // eslint-disable-next-line no-console
    console.log(`\n🔐 Keystone setup token: ${token}\n`);
    // eslint-disable-next-line no-console
    console.log(`   Use this token to complete setup at http://localhost:${process.env.PORT || 4001}/setup\n`);
  }
}
