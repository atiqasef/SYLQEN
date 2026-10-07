import { expect, test } from "@playwright/test";

import {
  expectNoHorizontalOverflow,
  exploreDemo,
  registerUser,
  signOut,
} from "./helpers";

test.describe("integrations module", () => {
  test("owner can open integrations, view cards, and open a detail page", async ({
    page,
  }) => {
    const stamp = Date.now();
    await registerUser(page, {
      name: "Integrations Owner",
      email: `integrations-owner-${stamp}@example.test`,
      password: "e2e-local-password-1",
    });

    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Integrations" })
      .click();
    await expect(page).toHaveURL(/\/integrations$/);
    await expect(page.locator("#integrations-heading")).toHaveText(
      "Integrations",
    );
    await expect(
      page.getByRole("heading", { name: "Platform integrations" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Stripe" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Resend" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "AI Assistant" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Planned" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Slack" })).toBeVisible();

    await page.getByRole("link", { name: "View details" }).first().click();
    await expect(page).toHaveURL(/\/integrations\/[a-z-]+$/);
    await expect(
      page.getByRole("heading", { name: "Capabilities" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Configuration" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Security" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Back to integrations" }),
    ).toBeVisible();

    await page.getByRole("link", { name: "Back to integrations" }).click();
    await expect(page).toHaveURL(/\/integrations$/);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/integrations");
    await expect(page.locator("#integrations-heading")).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await signOut(page);
  });

  test("demo can view integrations read-only", async ({ page }) => {
    await exploreDemo(page);

    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Integrations" })
      .click();
    await expect(page).toHaveURL(/\/integrations/);
    await expect(page.locator("#integrations-heading")).toHaveText(
      "Integrations",
    );
    await expect(
      page.getByText("Demo read-only", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(/Demo accounts can view Integrations/i),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Stripe" })).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await expectNoHorizontalOverflow(page);
  });
});
