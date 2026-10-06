import { expect, test } from "@playwright/test";

import {
  expectNoHorizontalOverflow,
  exploreDemo,
  registerUser,
  signOut,
} from "./helpers";

test.describe("payments module", () => {
  test("authenticated user can record, list, and view payments", async ({
    page,
  }) => {
    const stamp = Date.now();
    await registerUser(page, {
      name: "Payment Owner",
      email: `payment-owner-${stamp}@example.test`,
      password: "e2e-local-password-1",
    });

    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Customers" })
      .click();
    await page.getByRole("link", { name: "Add customer" }).first().click();
    await page.locator("#customer-name").fill(`Payment Customer ${stamp}`);
    await page
      .locator("#customer-email")
      .fill(`payment-customer-${stamp}@example.test`);
    await page.getByRole("button", { name: "Create customer" }).click();
    await expect(page).toHaveURL(/\/customers\/[a-f0-9]{24}/i);

    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Products" })
      .click();
    await page.getByRole("link", { name: "Add product" }).first().click();
    await page.locator("#product-name").fill(`Payment Product ${stamp}`);
    await page.locator("#product-sku").fill(`PAY-SKU-${stamp}`);
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
      label: `Payment Customer ${stamp}`,
    });
    await page.locator("#invoice-status").selectOption("sent");
    await page.locator("#invoice-issue-date").fill("2026-01-01");
    await page.locator("#invoice-due-date").fill("2026-01-31");
    await page
      .locator('select[id^="invoice-line-product-"]')
      .first()
      .selectOption({ label: `Payment Product ${stamp} (PAY-SKU-${stamp})` });
    await page.locator('input[id^="invoice-line-qty-"]').first().fill("1");
    await page.getByRole("button", { name: "Create invoice" }).click();
    await expect(page).toHaveURL(/\/invoices\/[a-f0-9]{24}/i);
    await expect(page.getByRole("heading", { name: "Payments" })).toBeVisible();
    await expect(page.getByText("Remaining").first()).toBeVisible();

    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Payments" })
      .click();
    await expect(page).toHaveURL(/\/payments/);
    await expect(page.locator("#payments-heading")).toBeVisible();
    await expect(page.getByText(/No payments yet/i)).toBeVisible();

    await page.getByRole("link", { name: "Record payment" }).first().click();
    await expect(page).toHaveURL(/\/payments\/new/);
    await expect(
      page.getByRole("heading", { name: /Invoice & customer/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Balance summary" }),
    ).toBeVisible();
    await page.locator("#payment-invoice").selectOption({ index: 1 });
    await page.locator("#payment-amount").fill("40");
    await page.locator("#payment-date").fill("2026-02-01");
    await page.locator("#payment-method").selectOption("bank_transfer");
    await page.locator("#payment-reference").fill(`PAY-REF-${stamp}`);
    await page.getByRole("button", { name: "Record payment" }).click();
    await expect(page).toHaveURL(/\/payments\/[a-f0-9]{24}/i);
    await expect(page.getByText(/Payment information/i)).toBeVisible();
    await expect(page.getByText("Bank transfer").first()).toBeVisible();
    await expect(page.getByText(`PAY-REF-${stamp}`).first()).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Financial summary" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "View invoice" }).click();
    await expect(page).toHaveURL(/\/invoices\/[a-f0-9]{24}/i);
    await expect(page.getByRole("heading", { name: "Payments" })).toBeVisible();
    await expect(page.getByText(/\$40\.00|40\.00/).first()).toBeVisible();

    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Payments" })
      .click();
    await expect(page.getByText(/1 payment/i)).toBeVisible();
    await expect(page.getByText("Bank transfer").first()).toBeVisible();
    await page.locator("#payments-search").fill(`PAY-REF-${stamp}`);
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(new RegExp(`q=PAY-REF-${stamp}`));
    await expect(page.getByText(/1 payment/i)).toBeVisible();

    await page.goto("/payments/new");
    await page.locator("#payment-invoice").selectOption({ index: 1 });
    await page.locator("#payment-amount").fill("1000");
    await page.locator("#payment-date").fill("2026-02-02");
    await page.locator("#payment-method").selectOption("cash");
    await page.getByRole("button", { name: "Record payment" }).click();
    await expect(page.getByText(/exceed/i).first()).toBeVisible();

    await signOut(page);
  });

  test("demo can view payments but cannot record them", async ({ page }) => {
    await exploreDemo(page);

    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Payments" })
      .click();
    await expect(page).toHaveURL(/\/payments/);
    await expect(page.locator("#payments-heading")).toBeVisible();
    await expect(page.getByText(/Demo accounts can view/i)).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Record payment" }),
    ).toHaveCount(0);

    await page.goto("/payments/new");
    await expect(
      page.getByText(/do not have permission to record payments/i),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Record payment" }),
    ).toHaveCount(0);
  });

  test("mobile payments pages have no horizontal overflow", async ({ page }) => {
    await exploreDemo(page);
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto("/payments");
    await expect(page.locator("#payments-heading")).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.goto("/payments/new");
    await expect(page.locator("#new-payment-heading")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
