import { expect, test } from "@playwright/test";

import { exploreDemo, signOut } from "./helpers";

test.describe("demo flow", () => {
  test("Explore Demo enters a read-only dashboard and logout protects routes", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "Explore Demo" })).toBeEnabled();
    await expect(page.getByText(/Demo access is read-only/i)).toBeVisible();

    await exploreDemo(page);

    await expect(page.getByText("Demo account", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Welcome, E2E Demo/i })).toBeVisible();
    await expect(page.getByText(/as viewer/i)).toBeVisible();

    const emailInput = page.locator("#demo-email");
    const workspaceInput = page.locator("#demo-workspace");
    await expect(emailInput).toHaveJSProperty("readOnly", true);
    await expect(workspaceInput).toHaveJSProperty("readOnly", true);
    await expect(
      page.getByText(/Demo accounts are read-only/i),
    ).toBeVisible();

    await page.reload();
    await expect(page.getByText("Demo account", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Welcome, E2E Demo/i })).toBeVisible();

    await signOut(page);

    await page.goto("/");
    await expect(page).toHaveURL(/\/login\?next=%2F/);
    await expect(
      page.getByRole("heading", { name: /Sign in to SYLQEN/i }),
    ).toBeVisible();
  });
});
