import { spawnSync } from "node:child_process";
import path from "node:path";

export default async function globalSetup() {
  const resetScript = path.resolve(__dirname, "../../scripts/reset-test-db.ts");
  const result = spawnSync("npx", ["tsx", resetScript], {
    cwd: path.resolve(__dirname, ".."),
    env: {
      ...process.env,
      KEYSTONE_ADMIN_DATABASE_URL:
        process.env.KEYSTONE_ADMIN_DATABASE_URL ||
        "postgresql://kiyota:kiyota@localhost:5432/postgres",
    },
    stdio: "inherit",
    shell: false,
  });

  if (result.status !== 0) {
    throw new Error("Failed to reset test database");
  }
}
