import { expect, test } from "@playwright/test";

import { exploreDemo, expectNoHorizontalOverflow } from "./helpers";

test.describe("responsive shell", () => {
  test.beforeEach(async ({ page }) => {
    await exploreDemo(page);
  });

  test("desktop shell has no horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(
      page.getByRole("heading", { name: /Welcome, E2E Demo/i }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("mobile shell has no horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(
      page.getByRole("heading", { name: /Welcome, E2E Demo/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Open navigation" }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
