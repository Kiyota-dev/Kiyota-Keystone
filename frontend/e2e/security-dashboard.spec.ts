import { test, expect } from "@playwright/test";

test.describe("Security dashboard", () => {
  test("shows security metrics after login", async ({ page }) => {
    await page.goto("/#/dashboard/security");

    await expect(page.getByText("Security overview")).toBeVisible();
    await expect(page.getByText("Recent login activity")).toBeVisible();

    // Key metric cards are rendered.
    await expect(page.getByText("24h logins")).toBeVisible();
    await expect(page.getByText("24h failed logins")).toBeVisible();
    await expect(page.getByText("Active sessions")).toBeVisible();
    await expect(page.getByText("MFA adoption")).toBeVisible();
  });
});
