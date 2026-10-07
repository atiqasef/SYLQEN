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
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offsetDays),
  );
  return date.toISOString().slice(0, 10);
}

test.describe("financial dashboard", () => {
  test("loads KPIs, financial sections, date range, and navigation", async ({
    page,
  }) => {
    const stamp = Date.now();
    const issueDate = utcDateOnly(-5);
    const dueDate = utcDateOnly(20);
    const paymentDate = utcDateOnly(-2);

    await registerUser(page, {
      name: "Dashboard Owner",
      email: `dashboard-owner-${stamp}@example.test`,
      password: "e2e-local-password-1",
    });

    await expect(
      page.getByRole("heading", { name: /Financial overview/i }),
    ).toBeVisible();
    await expect(page.getByLabel(/Total invoiced:/i)).toBeVisible();
    await expect(page.getByLabel(/Total paid:/i)).toBeVisible();
    await expect(page.getByLabel(/Outstanding:/i)).toBeVisible();
    await expect(page.getByLabel(/Overdue:/i)).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Payment revenue/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Outstanding invoices/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Recent payments/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Recent invoices/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Dashboard date range" }),
    ).toBeVisible();

    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Customers" })
      .click();
    await page.getByRole("link", { name: "Add customer" }).first().click();
    await page.locator("#customer-name").fill(`Dash Customer ${stamp}`);
    await page
      .locator("#customer-email")
      .fill(`dash-customer-${stamp}@example.test`);
    await page.getByRole("button", { name: "Create customer" }).click();
    await expect(page).toHaveURL(/\/customers\/[a-f0-9]{24}/i);

    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Products" })
      .click();
    await page.getByRole("link", { name: "Add product" }).first().click();
    await page.locator("#product-name").fill(`Dash Product ${stamp}`);
    await page.locator("#product-sku").fill(`DASH-SKU-${stamp}`);
    await page.locator("#product-price").fill("100");
    await page.locator("#product-currency").fill("USD");
    await page.getByRole("button", { name: "Create product" }).click();
    await expect(page).toHaveURL(/\/products\/[a-f0-9]{24}/i);

    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Invoices" })
      .click();
    await page.getByRole("link", { name: "Add invoice" }).first().click();
    await page.locator("#invoice-customer").selectOption({
      label: `Dash Customer ${stamp}`,
    });
    await page.locator("#invoice-status").selectOption("sent");
    await page.locator("#invoice-issue-date").fill(issueDate);
    await page.locator("#invoice-due-date").fill(dueDate);
    await page
      .locator('select[id^="invoice-line-product-"]')
      .first()
      .selectOption({ label: `Dash Product ${stamp} (DASH-SKU-${stamp})` });
    await page.locator('input[id^="invoice-line-qty-"]').first().fill("1");
    await page.getByRole("button", { name: "Create invoice" }).click();
    await expect(page).toHaveURL(/\/invoices\/[a-f0-9]{24}/i);
    const invoiceUrl = page.url();

    await page.goto("/payments/new");
    await page.locator("#payment-invoice").selectOption({ index: 1 });
    await page.locator("#payment-amount").fill("40");
    await page.locator("#payment-date").fill(paymentDate);
    await page.locator("#payment-method").selectOption("bank_transfer");
    await page.getByRole("button", { name: "Record payment" }).click();
    await expect(page).toHaveURL(/\/payments\/[a-f0-9]{24}/i);
    const paymentUrl = page.url();

    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Overview" })
      .click();
    await expect(page).toHaveURL(/\/(\?range=\d+)?$/);
    await expect(page.getByLabel(/Total invoiced:/i)).toContainText(/100/);
    await expect(page.getByLabel(/Total paid:/i)).toContainText(/40/);
    await expect(page.getByLabel(/Outstanding:/i)).toContainText(/60/);

    await page
      .getByRole("navigation", { name: "Dashboard date range" })
      .getByRole("link", { name: "Last 7 days" })
      .click();
    await expect(page).toHaveURL(/\?range=7/);
    await expect(
      page
        .getByRole("navigation", { name: "Dashboard date range" })
        .getByRole("link", { name: "Last 7 days" }),
    ).toHaveAttribute("aria-current", "page");

    await page
      .getByRole("navigation", { name: "Dashboard date range" })
      .getByRole("link", { name: "Last 30 days" })
      .click();
    await expect(page).toHaveURL(/\/$/);

    await page
      .getByRole("link", { name: /View payment .* for INV-/i })
      .first()
      .click();
    await expect(page).toHaveURL(paymentUrl);

    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Overview" })
      .click();
    await page.locator('a[href^="/invoices/"]').filter({ hasText: "INV-000001" }).first().click();
    await expect(page).toHaveURL(invoiceUrl);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /Financial overview/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Open navigation" }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await signOut(page);
  });

  test("demo dashboard remains readable and read-only", async ({ page }) => {
    await exploreDemo(page);
    await expect(
      page.getByRole("heading", { name: /Financial overview/i }),
    ).toBeVisible();
    await expect(page.getByLabel(/Total invoiced:/i)).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Payment revenue/i }),
    ).toBeVisible();
    await expect(page.getByText("Demo account", { exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await expectNoHorizontalOverflow(page);
  });
});
