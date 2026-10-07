import { expect, test } from "@playwright/test";

import { passwordField } from "./helpers";

test.describe("authentication UI", () => {
  test("register form renders and validates short passwords", async ({
    page,
  }) => {
    await page.goto("/register");

    await page.getByLabel("Name").fill("E2E Tester");
    await page.getByLabel("Email").fill("e2e-user@example.test");
    await passwordField(page, "password").fill("short");
    await passwordField(page, "confirmPassword").fill("short");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.locator("p[role='alert']")).toContainText(
      /Password must be at least 8 characters/i,
    );
    await expect(page).toHaveURL(/\/register/);
  });

  test("login form shows an error for invalid credentials", async ({
    page,
  }) => {
    await page.goto("/login");

    await page.getByLabel("Email").fill("nobody@example.test");
    await passwordField(page, "password").fill("definitely-wrong-password");
    await page.getByRole("button", { name: "Continue with email" }).click();

    const alert = page.locator("p[role='alert']");
    await expect(alert).toBeVisible();
    await expect(alert).not.toHaveText("");
    await expect(page).toHaveURL(/\/login/);
  });

  test("login keeps social placeholders, email, and demo controls without real OAuth", async ({
    page,
  }) => {
    await page.goto("/login");

    // E2E server intentionally omits social credentials — no real OAuth.
    const google = page.getByRole("button", {
      name: "Google sign-in not configured",
    });
    await expect(google).toBeVisible();
    await expect(google).toBeDisabled();

    const facebook = page.getByRole("button", {
      name: "Facebook sign-in not configured",
    });
    await expect(facebook).toBeVisible();
    await expect(facebook).toBeDisabled();

    await expect(
      page.getByRole("button", { name: "Continue with email" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Explore Demo" }),
    ).toBeVisible();
  });

  test("register shows social placeholders without initiating real OAuth", async ({
    page,
  }) => {
    await page.goto("/register");

    const google = page.getByRole("button", {
      name: "Google sign-in not configured",
    });
    await expect(google).toBeVisible();
    await expect(google).toBeDisabled();

    const facebook = page.getByRole("button", {
      name: "Facebook sign-in not configured",
    });
    await expect(facebook).toBeVisible();
    await expect(facebook).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Create account" }),
    ).toBeVisible();
  });
});
