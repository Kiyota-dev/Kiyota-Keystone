import { defineConfig, devices } from "@playwright/test";

const TEST_DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://kiyota:kiyota@localhost:5432/kiyota_test";
const TEST_REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const TEST_SETUP_TOKEN = process.env.KEYSTONE_SETUP_TOKEN || "test-setup-token";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "line",
  globalSetup: require.resolve("./e2e/global-setup"),
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "cd .. && npm run dev:setup",
      url: "http://localhost:4001/health",
      timeout: 120000,
      reuseExistingServer: !process.env.CI,
      env: {
        DATABASE_URL: TEST_DATABASE_URL,
        REDIS_URL: TEST_REDIS_URL,
        KEYSTONE_QUEUE_PROVIDER: process.env.KEYSTONE_QUEUE_PROVIDER || "",
        KEYSTONE_SETUP_TOKEN: TEST_SETUP_TOKEN,
        PORT: "4001",
      },
    },
    {
      command: "npm run dev",
      url: "http://localhost:5173",
      timeout: 120000,
      reuseExistingServer: !process.env.CI,
      env: {
        KEYSTONE_API_URL: process.env.KEYSTONE_API_URL || "http://localhost:4001",
      },
    },
  ],
});
