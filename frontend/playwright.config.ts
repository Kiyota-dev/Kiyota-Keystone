import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "line",
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
      command: "cd .. && npm run dev",
      url: "http://localhost:4001/health",
      timeout: 120000,
      reuseExistingServer: !process.env.CI,
      env: {
        DATABASE_URL: process.env.DATABASE_URL || "postgresql://kiyota:kiyota@localhost:5432/kiyota",
        REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
        KEYSTONE_QUEUE_PROVIDER: process.env.KEYSTONE_QUEUE_PROVIDER || "",
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
