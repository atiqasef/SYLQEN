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

test.describe("finance module", () => {
  test("owner can open finance, see KPIs, change range, and view receivables", async ({
    page,
  }) => {
    const stamp = Date.now();
    const issueDate = utcDateOnly(-10);
    const dueDate = utcDateOnly(-2);

    await registerUser(page, {
      name: "Finance Owner",
      email: `finance-owner-${stamp}@example.test`,
      password: "e2e-local-password-1",
    });

    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Customers" })
      .click();
    await page.getByRole("link", { name: "Add customer" }).first().click();
    await page.locator("#customer-name").fill(`Finance Customer ${stamp}`);
    await page
      .locator("#customer-email")
      .fill(`finance-customer-${stamp}@example.test`);
    await page.getByRole("button", { name: "Create customer" }).click();
    await expect(page).toHaveURL(/\/customers\/[a-f0-9]{24}/i);

    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Products" })
      .click();
    await page.getByRole("link", { name: "Add product" }).first().click();
    await page.locator("#product-name").fill(`Finance Product ${stamp}`);
    await page.locator("#product-sku").fill(`FIN-SKU-${stamp}`);
    await page.locator("#product-price").fill("200");
    await page.locator("#product-currency").fill("USD");
    await page.getByRole("button", { name: "Create product" }).click();
    await expect(page).toHaveURL(/\/products\/[a-f0-9]{24}/i);

    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Invoices" })
      .click();
    await page.getByRole("link", { name: "Add invoice" }).first().click();
    await page.locator("#invoice-customer").selectOption({
      label: `Finance Customer ${stamp}`,
    });
    await page.locator("#invoice-status").selectOption("sent");
    await page.locator("#invoice-issue-date").fill(issueDate);
    await page.locator("#invoice-due-date").fill(dueDate);
    await page
      .locator('select[id^="invoice-line-product-"]')
      .first()
      .selectOption({ label: `Finance Product ${stamp} (FIN-SKU-${stamp})` });
    await page.locator('input[id^="invoice-line-qty-"]').first().fill("1");
    await page.getByRole("button", { name: "Create invoice" }).click();
    await expect(page).toHaveURL(/\/invoices\/[a-f0-9]{24}/i);

    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Finance" })
      .click();
    await expect(page).toHaveURL(/\/finance/);
    await expect(page.locator("#finance-heading")).toHaveText("Finance");
    await expect(page.getByLabel(/Total invoiced:/i)).toBeVisible();
    await expect(page.getByLabel(/Total paid:/i)).toBeVisible();
    await expect(page.getByLabel(/Outstanding:/i)).toBeVisible();
    await expect(page.getByLabel(/Overdue:/i)).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Revenue & invoicing" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Receivables" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Recent activity" }),
    ).toBeVisible();
    await expect(page.getByText(/Overdue/i).first()).toBeVisible();

    await page
      .getByRole("navigation", { name: "Finance date range" })
      .getByRole("link", { name: "Last 7 days" })
      .click();
    await expect(page).toHaveURL(/\/finance\?range=7/);
    await expect(page.getByLabel(/Total invoiced:/i)).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/finance");
    await expect(page.locator("#finance-heading")).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await signOut(page);
  });

  test("demo can view finance read-only", async ({ page }) => {
    await exploreDemo(page);

    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Finance" })
      .click();
    await expect(page).toHaveURL(/\/finance/);
    await expect(page.locator("#finance-heading")).toHaveText("Finance");
    await expect(page.getByText("Demo read-only", { exact: true })).toBeVisible();
    await expect(
      page.getByText(/Demo accounts can view Finance/i),
    ).toBeVisible();
    await expect(page.getByLabel(/Total invoiced:/i)).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await expectNoHorizontalOverflow(page);
  });
});
