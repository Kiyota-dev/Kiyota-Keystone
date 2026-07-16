import { test, expect } from "@playwright/test";

const SETUP_TOKEN = process.env.KEYSTONE_SETUP_TOKEN || "test-setup-token";
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://kiyota:kiyota@localhost:5432/kiyota";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

test.describe("Keystone setup wizard", () => {
  test("configures a fresh install through the advanced browser wizard", async ({ page }) => {
    await page.goto("/#/setup/advanced");

    await expect(page.getByText("Welcome to Keystone")).toBeVisible();

    // Step 1: Token
    await page.getByLabel("Setup token").fill(SETUP_TOKEN);
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 2: Infrastructure
    await expect(page.getByText("Configure PostgreSQL and Redis")).toBeVisible();
    await page.getByLabel("Database URL").fill(DATABASE_URL);
    await page.getByLabel("Redis URL").fill(REDIS_URL);
    await page.getByRole("button", { name: "Test database" }).click();
    await expect(page.getByText("Database connection successful")).toBeVisible();
    await page.getByRole("button", { name: "Test Redis" }).click();
    await expect(page.getByText("Redis connection successful")).toBeVisible();

    // Step 3: URLs
    await page.getByRole("button", { name: "Continue" }).nth(0).click();
    await expect(page.getByText("Set the public URLs")).toBeVisible();
    await page.getByLabel("Auth API public URL").fill("http://localhost:4001");
    await page.getByLabel("Client app URL").fill("http://localhost:5173");
    await page.getByLabel("Allowed CORS origins").fill("http://localhost:5173");
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 4: Secrets
    await expect(page.getByText("Generate secure platform secrets")).toBeVisible();
    await page.getByRole("button", { name: "Generate secrets" }).click();
    await expect(page.getByText("Secrets generated")).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 5: Email
    await expect(page.getByText("Choose how Keystone sends emails")).toBeVisible();
    await page.getByLabel("Email provider").selectOption("console");
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 6: SMS
    await expect(page.getByText("Choose how Keystone sends SMS messages")).toBeVisible();
    await page.getByLabel("SMS provider").selectOption("none");
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 7: Connectors
    await expect(page.getByText("Enable optional identity connectors")).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 8: Owner account
    await expect(page.getByText("Create the first platform owner account")).toBeVisible();
    await page.getByLabel("Full name (optional)").fill("Setup Admin");
    await page.getByLabel("Email address").fill("owner@example.com");
    await page.getByLabel("Password").fill("Str0ngP@ssw0rd!");

    // Note: owner creation happens after apply/migrate in the current flow.
    // The review step is reached from the Owner step via Continue, then Apply.
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 9: Review
    await expect(page.getByText("Review the configuration before applying")).toBeVisible();
    await page.getByRole("button", { name: "Apply configuration" }).click();

    // Step 10: Done / create owner
    await expect(page.getByText("Configuration applied")).toBeVisible();
    await page.getByRole("button", { name: "Create owner account" }).click();

    await expect(page.getByText("Setup complete")).toBeVisible();

    // Reloading after setup should show the completed state.
    await page.reload();
    await expect(page.getByText("Keystone is ready")).toBeVisible();
  });
});
