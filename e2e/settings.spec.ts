import { expect, test } from "@playwright/test";

import {
  expectNoHorizontalOverflow,
  exploreDemo,
  registerUser,
  signOut,
} from "./helpers";

test.describe("settings module", () => {
  test("owner can open settings, rename workspace, and update account name", async ({
    page,
  }) => {
    const stamp = Date.now();
    await registerUser(page, {
      name: "Settings Owner",
      email: `settings-owner-${stamp}@example.test`,
      password: "e2e-local-password-1",
    });

    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Settings" })
      .click();
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.locator("#settings-heading")).toHaveText("Settings");
    await expect(
      page.getByRole("heading", { name: "Workspace" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Account" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Preferences" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Security & access" }),
    ).toBeVisible();

    await page.getByLabel(/Workspace name/i).fill("Renamed Workspace");
    await page.getByRole("button", { name: "Save workspace" }).click();
    await expect(page.getByText("Workspace name saved.")).toBeVisible();
    await expect(page.getByText("Renamed Workspace").first()).toBeVisible();

    await page.getByLabel(/Display name/i).fill("Settings Owner Renamed");
    await page.getByRole("button", { name: "Save account" }).click();
    await expect(page.getByText("Account name saved.")).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/settings");
    await expect(page.locator("#settings-heading")).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await signOut(page);
  });

  test("demo can view settings but cannot mutate workspace or account", async ({
    page,
  }) => {
    await exploreDemo(page);

    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Settings" })
      .click();
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.locator("#settings-heading")).toHaveText("Settings");
    await expect(page.getByText("Demo read-only", { exact: true })).toBeVisible();
    await expect(
      page.getByText(/Demo accounts can review settings/i),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Save workspace" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Save account" }),
    ).toHaveCount(0);
    await expect(page.getByLabel(/Workspace name/i)).toBeDisabled();
    await expect(page.getByLabel(/Display name/i)).toBeDisabled();
    await expect(page.getByRole("radio", { name: /Light/i })).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await expectNoHorizontalOverflow(page);
  });
});
