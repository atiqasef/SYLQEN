import { expect, test } from "@playwright/test";

import { exploreDemo, signOut } from "./helpers";

test.describe("navigation", () => {
  test.beforeEach(async ({ page }) => {
    await exploreDemo(page);
  });

  test("overview navigation and account menu work", async ({ page }) => {
    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Overview" })
      .click();
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole("heading", { name: /Welcome, E2E Demo/i }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Account menu" }).click();
    await expect(page.getByRole("menuitem", { name: "Settings" })).toBeVisible();
    await page.getByRole("menuitem", { name: "Settings" }).click();
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.locator("#settings-heading")).toHaveText("Settings");

    await page.getByRole("button", { name: "Account menu" }).click();
    await expect(page.getByRole("menuitem", { name: "Sign out" })).toBeVisible();

    await signOut(page);
  });
});
