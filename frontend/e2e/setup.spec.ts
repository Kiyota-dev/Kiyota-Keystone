import { test, expect } from "@playwright/test";

test.describe("Keystone setup wizard", () => {
  test("creates the owner account on a fresh install", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("Welcome to Keystone")).toBeVisible();

    await page.getByLabel("Full name (optional)").fill("Setup Admin");
    await page.getByLabel("Email address").fill("owner@example.com");
    await page.getByLabel("Password").fill("Str0ngP@ssw0rd!");
    await page.getByRole("button", { name: "Create owner account" }).click();

    await expect(page.getByText("Owner account created")).toBeVisible();

    // Reloading after setup should show the completed state.
    await page.reload();
    await expect(page.getByText("Keystone is ready")).toBeVisible();
  });
});
