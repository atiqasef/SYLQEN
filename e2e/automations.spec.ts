import { expect, test } from "@playwright/test";

import {
  expectNoHorizontalOverflow,
  exploreDemo,
  registerUser,
  signOut,
} from "./helpers";

test.describe("automations module", () => {
  test("owner can create, view, edit, and disable an automation", async ({
    page,
  }) => {
    const stamp = Date.now();
    await registerUser(page, {
      name: "Automations Owner",
      email: `automations-owner-${stamp}@example.test`,
      password: "e2e-local-password-1",
    });

    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Automations" })
      .click();
    await expect(page).toHaveURL(/\/automations/);
    await expect(page.locator("#automations-heading")).toHaveText("Automations");

    await page.getByRole("link", { name: "Create automation" }).first().click();
    await expect(page).toHaveURL(/\/automations\/new/);
    await page.locator("#automation-name").fill(`Notify customers ${stamp}`);
    await page.locator("#automation-description").fill("E2E automation");
    await page.locator("#automation-trigger").selectOption("customer.created");
    await page.getByRole("button", { name: "Create automation" }).click();
    await expect(page).toHaveURL(/\/automations\/[a-f0-9]{24}/i);
    await expect(
      page.getByRole("heading", { name: `Notify customers ${stamp}` }),
    ).toBeVisible();
    await expect(page.getByText("Enabled")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Recent executions" }),
    ).toBeVisible();

    await page.getByRole("link", { name: "Edit" }).click();
    await expect(page).toHaveURL(/\/edit$/);
    await page.getByLabel("Enabled").uncheck();
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Disabled").first()).toBeVisible();

    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Automations" })
      .click();
    await expect(page.getByText(`Notify customers ${stamp}`)).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/automations");
    await expect(page.locator("#automations-heading")).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await signOut(page);
  });

  test("demo can view automations but cannot create", async ({ page }) => {
    await exploreDemo(page);

    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Automations" })
      .click();
    await expect(page).toHaveURL(/\/automations/);
    await expect(page.locator("#automations-heading")).toHaveText("Automations");
    await expect(
      page.getByText("Demo read-only", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Create automation" }),
    ).toHaveCount(0);

    await page.goto("/automations/new");
    await expect(
      page.getByText(/do not have permission to create automations/i),
    ).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/automations");
    await expectNoHorizontalOverflow(page);
  });
});
