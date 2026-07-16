import { test, expect } from "@playwright/test";

const SETUP_TOKEN = process.env.KEYSTONE_SETUP_TOKEN || "test-setup-token";
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://kiyota:kiyota@localhost:5432/kiyota";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

test.describe("Keystone simple setup wizard", () => {
  test("configures a fresh install through the simple wizard", async ({ page }) => {
    await page.goto("/#/setup/simple");

    await expect(page.getByText("Welcome to Keystone")).toBeVisible();

    // Step 1: Welcome + token
    await page.getByLabel("Setup token").fill(SETUP_TOKEN);
    await page.getByRole("button", { name: "Start setup" }).click();

    // Step 2: Dependencies
    await expect(page.getByText("Connect dependencies")).toBeVisible();
    await page.getByLabel("Database URL").fill(DATABASE_URL);
    await page.getByLabel("Redis URL").fill(REDIS_URL);
    await page.getByRole("button", { name: "Test database" }).click();
    await expect(page.getByText("Database connection successful")).toBeVisible();
    await page.getByRole("button", { name: "Test Redis" }).click();
    await expect(page.getByText("Redis connection successful")).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 3: Owner account
    await expect(page.getByText("Create owner account")).toBeVisible();
    await page.getByLabel("Full name (optional)").fill("Setup Admin");
    await page.getByLabel("Email").fill("simple-owner@example.com");
    await page.getByLabel("Password").fill("Str0ngP@ssw0rd!");
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 4: First application
    await expect(page.getByText("Connect your first project")).toBeVisible();
    await page.getByLabel("Project name").fill("My First App");
    await page.getByLabel("Project URL").fill("http://localhost:3000");
    await page.getByRole("button", { name: "Finish setup" }).click();

    // Step 5: Diagnostics
    await expect(page.getByText("System diagnostics")).toBeVisible();
  });
});
