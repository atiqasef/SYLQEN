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
  await page.goto("/register");
  await page.getByLabel("Name").fill(options.name);
  await page.getByLabel("Email").fill(options.email);
  await passwordField(page, "password").fill(options.password);
  await passwordField(page, "confirmPassword").fill(options.password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("heading", { name: new RegExp(`Welcome, ${options.name}`, "i") }),
  ).toBeVisible();
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
