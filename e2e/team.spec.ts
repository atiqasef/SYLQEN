import { expect, test } from "@playwright/test";

import {
  expectNoHorizontalOverflow,
  exploreDemo,
  registerUser,
  signOut,
} from "./helpers";

test.describe("team members module", () => {
  test("owner can open team, see themselves, and final-owner controls stay protected", async ({
    page,
  }) => {
    const stamp = Date.now();
    await registerUser(page, {
      name: "Team Owner",
      email: `team-owner-${stamp}@example.test`,
      password: "e2e-local-password-1",
    });

    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Team" })
      .click();
    await expect(page).toHaveURL(/\/team/);
    await expect(page.locator("#team-heading")).toHaveText("Team");
    await expect(
      page.getByRole("heading", { name: "Workspace members" }),
    ).toBeVisible();
    await expect(page.getByText("Team Owner").first()).toBeVisible();
    await expect(
      page.getByText(`team-owner-${stamp}@example.test`).first(),
    ).toBeVisible();
    await expect(page.getByText("You", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/1 member/i)).toBeVisible();
    await expect(page.getByText(/Final owner cannot be demoted/i).first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Remove Team Owner from workspace/i }),
    ).toHaveCount(0);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/team");
    await expect(page.locator("#team-heading")).toBeVisible();
    const mobileList = page.getByRole("list", {
      name: "Workspace team members",
    });
    await expect(mobileList.getByText("You", { exact: true })).toBeVisible();
    await expect(
      mobileList.getByText(/This is the final owner and cannot be removed/i),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await signOut(page);
  });

  test("demo can view team but cannot manage members", async ({ page }) => {
    await exploreDemo(page);

    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Team" })
      .click();
    await expect(page).toHaveURL(/\/team/);
    await expect(page.locator("#team-heading")).toHaveText("Team");
    await expect(page.getByText("Demo read-only", { exact: true })).toBeVisible();
    await expect(
      page.getByText(/Demo accounts can view the team and roles/i),
    ).toBeVisible();
    await expect(page.getByRole("combobox")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /Remove .+ from workspace/i }),
    ).toHaveCount(0);

    await page.setViewportSize({ width: 390, height: 844 });
    await expectNoHorizontalOverflow(page);
  });
});
