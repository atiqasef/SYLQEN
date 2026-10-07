import { expect, test } from "@playwright/test";

import {
  expectNoHorizontalOverflow,
  exploreDemo,
  registerUser,
  signOut,
} from "./helpers";

function utcDateOnly(offsetDays = 0) {
  const now = new Date();
  const date = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + offsetDays,
    ),
  );
  return date.toISOString().slice(0, 10);
}

test.describe("analytics module", () => {
  test("owner can open analytics, see sections, and change range", async ({
    page,
  }) => {
    const stamp = Date.now();
    const issueDate = utcDateOnly(-10);
    const dueDate = utcDateOnly(-2);

    await registerUser(page, {
      name: "Analytics Owner",
      email: `analytics-owner-${stamp}@example.test`,
      password: "e2e-local-password-1",
    });

    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Customers" })
      .click();
    await page.getByRole("link", { name: "Add customer" }).first().click();
    await page.locator("#customer-name").fill(`Analytics Customer ${stamp}`);
    await page
      .locator("#customer-email")
      .fill(`analytics-customer-${stamp}@example.test`);
    await page.getByRole("button", { name: "Create customer" }).click();
    await expect(page).toHaveURL(/\/customers\/[a-f0-9]{24}/i);

    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Products" })
      .click();
    await page.getByRole("link", { name: "Add product" }).first().click();
    await page.locator("#product-name").fill(`Analytics Product ${stamp}`);
    await page.locator("#product-sku").fill(`AN-SKU-${stamp}`);
    await page.locator("#product-price").fill("150");
    await page.locator("#product-currency").fill("USD");
    await page.getByRole("button", { name: "Create product" }).click();
    await expect(page).toHaveURL(/\/products\/[a-f0-9]{24}/i);

    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Projects" })
      .click();
    await page.getByRole("link", { name: "Add project" }).first().click();
    await page.locator("#project-name").fill(`Analytics Project ${stamp}`);
    await page.locator("#project-status").selectOption("active");
    await page.locator("#project-due-date").fill(utcDateOnly(5));
    await page.getByRole("button", { name: "Create project" }).click();
    await expect(page).toHaveURL(/\/projects\/[a-f0-9]{24}/i);

    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Invoices" })
      .click();
    await page.getByRole("link", { name: "Add invoice" }).first().click();
    await page.locator("#invoice-customer").selectOption({
      label: `Analytics Customer ${stamp}`,
    });
    await page.locator("#invoice-status").selectOption("sent");
    await page.locator("#invoice-issue-date").fill(issueDate);
    await page.locator("#invoice-due-date").fill(dueDate);
    await page
      .locator('select[id^="invoice-line-product-"]')
      .first()
      .selectOption({
        label: `Analytics Product ${stamp} (AN-SKU-${stamp})`,
      });
    await page.locator('input[id^="invoice-line-qty-"]').first().fill("1");
    await page.getByRole("button", { name: "Create invoice" }).click();
    await expect(page).toHaveURL(/\/invoices\/[a-f0-9]{24}/i);

    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Analytics" })
      .click();
    await expect(page).toHaveURL(/\/analytics/);
    await expect(page.locator("#analytics-heading")).toHaveText("Analytics");
    await expect(
      page.getByRole("heading", { name: "Executive overview" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Invoiced vs paid" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Business signals" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Customer insights" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Product insights" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Project insights" }),
    ).toBeVisible();
    await expect(
      page.getByText(`Analytics Customer ${stamp}`).first(),
    ).toBeVisible();
    await expect(
      page.getByText(`Analytics Product ${stamp}`).first(),
    ).toBeVisible();

    await page
      .getByRole("navigation", { name: "Analytics date range" })
      .getByRole("link", { name: "Last 7 days" })
      .click();
    await expect(page).toHaveURL(/\/analytics\?range=7/);
    await expect(
      page.getByRole("heading", { name: "Executive overview" }),
    ).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/analytics");
    await expect(page.locator("#analytics-heading")).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await signOut(page);
  });

  test("demo can view analytics read-only", async ({ page }) => {
    await exploreDemo(page);

    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Analytics" })
      .click();
    await expect(page).toHaveURL(/\/analytics/);
    await expect(page.locator("#analytics-heading")).toHaveText("Analytics");
    await expect(
      page.getByText("Demo read-only", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(/Demo accounts can view Analytics/i),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Executive overview" }),
    ).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await expectNoHorizontalOverflow(page);
  });
});
