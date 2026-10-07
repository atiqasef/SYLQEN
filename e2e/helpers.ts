import { expect, type Page } from "@playwright/test";

export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
    };
  });

  expect(
    overflow.scrollWidth,
    `horizontal overflow detected (${overflow.scrollWidth} > ${overflow.clientWidth})`,
  ).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

/** Password inputs share accessible names with their show/hide toggles. */
export function passwordField(page: Page, id: "password" | "confirmPassword") {
  return page.locator(`#${id}`);
}

export async function exploreDemo(page: Page) {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Explore Demo" })).toBeEnabled();
  await page.getByRole("button", { name: "Explore Demo" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("heading", { name: /Welcome,/i }),
  ).toBeVisible();
}

export async function registerUser(
  page: Page,
  options: { name: string; email: string; password: string },
) {
  // Better Auth may rate-limit rapid sign-ups across a long E2E suite.
  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    await page.goto("/register");
    await page.getByLabel("Name").fill(options.name);
    await page.getByLabel("Email").fill(options.email);
    await passwordField(page, "password").fill(options.password);
    await passwordField(page, "confirmPassword").fill(options.password);
    await page.getByRole("button", { name: "Create account" }).click();

    const rateLimited = page.getByRole("alert").filter({
      hasText: /too many requests/i,
    });

    const navigated = await page
      .waitForURL(/\/$/, { timeout: 8_000 })
      .then(() => true)
      .catch(() => false);

    if (navigated) {
      await expect(
        page.getByRole("heading", {
          name: new RegExp(`Welcome, ${options.name}`, "i"),
        }),
      ).toBeVisible();
      return;
    }

    if (await rateLimited.isVisible().catch(() => false)) {
      if (attempt === maxAttempts) {
        throw new Error("Registration rate-limited after retries");
      }
      await page.waitForTimeout(4_000 * attempt);
      continue;
    }

    throw new Error("Registration did not navigate and was not rate-limited");
  }
}

export async function signOut(page: Page) {
  const signOutItem = page.getByRole("menuitem", { name: "Sign out" });
  if (!(await signOutItem.isVisible().catch(() => false))) {
    await page.getByRole("button", { name: "Account menu" }).click();
  }
  await signOutItem.click();
  await expect(page).toHaveURL(/\/login/);
  await expect(
    page.getByRole("heading", { name: /Sign in to SYLQEN/i }),
  ).toBeVisible();
}
