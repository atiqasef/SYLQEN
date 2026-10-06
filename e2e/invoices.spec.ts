import { expect, test } from "@playwright/test";

import {
  expectNoHorizontalOverflow,
  exploreDemo,
  registerUser,
  signOut,
} from "./helpers";

test.describe("invoices module", () => {
  test("authenticated user can create, search, paginate, edit, and view invoices", async ({
    page,
  }) => {
    const stamp = Date.now();
    await registerUser(page, {
      name: "Invoice Owner",
      email: `invoice-owner-${stamp}@example.test`,
      password: "e2e-local-password-1",
    });

    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Customers" })
      .click();
    await page.getByRole("link", { name: "Add customer" }).first().click();
    await page.locator("#customer-name").fill(`Invoice Customer ${stamp}`);
    await page.locator("#customer-email").fill(`invoice-customer-${stamp}@example.test`);
    await page.getByRole("button", { name: "Create customer" }).click();
    await expect(page).toHaveURL(/\/customers\/[a-f0-9]{24}/i);

    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Products" })
      .click();
    await page.getByRole("link", { name: "Add product" }).first().click();
    await page.locator("#product-name").fill(`Invoice Product ${stamp}`);
    await page.locator("#product-sku").fill(`INV-SKU-${stamp}`);
    await page.locator("#product-price").fill("50");
    await page.locator("#product-currency").fill("USD");
    await page.getByRole("button", { name: "Create product" }).click();
    await expect(page).toHaveURL(/\/products\/[a-f0-9]{24}/i);

    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Invoices" })
      .click();
    await expect(page).toHaveURL(/\/invoices/);
    await expect(page.locator("#invoices-heading")).toBeVisible();
    await expect(page.getByText(/No invoices yet/i)).toBeVisible();

    for (let i = 0; i < 3; i += 1) {
      await page.getByRole("link", { name: "Add invoice" }).first().click();
      await expect(page).toHaveURL(/\/invoices\/new/);
      await expect(
        page.getByRole("heading", { name: /Customer & invoice details/i }),
      ).toBeVisible();
      await page.locator("#invoice-customer").selectOption({
        label: `Invoice Customer ${stamp}`,
      });
      await page.locator("#invoice-status").selectOption("draft");
      await page.locator("#invoice-issue-date").fill("2026-01-01");
      await page.locator("#invoice-due-date").fill("2026-01-31");
      await page
        .locator('select[id^="invoice-line-product-"]')
        .first()
        .selectOption({ label: `Invoice Product ${stamp} (INV-SKU-${stamp})` });
      await page.locator('input[id^="invoice-line-qty-"]').first().fill(String(i + 1));

      if (i === 0) {
        await page.getByRole("button", { name: "Add item" }).click();
        await expect(
          page.locator('select[id^="invoice-line-product-"]'),
        ).toHaveCount(2);
        await page.getByRole("button", { name: /Remove line item 2/i }).click();
        await expect(
          page.locator('select[id^="invoice-line-product-"]'),
        ).toHaveCount(1);
      }

      await page.locator("#invoice-notes").fill(
        i === 1 ? "Searchable invoice note kit" : "Other invoice",
      );
      await expect(page.getByRole("heading", { name: "Summary" })).toBeVisible();
      await page.getByRole("button", { name: "Create invoice" }).click();
      await expect(page).toHaveURL(/\/invoices\/[a-f0-9]{24}/i);
      await expect(page.getByText(/INV-00000/i).first()).toBeVisible();
      await expect(page.getByText("Draft").first()).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Invoice information" }),
      ).toBeVisible();
      await expect(page.getByRole("heading", { name: "Line items" })).toBeVisible();
      await page.getByRole("link", { name: "Back to list" }).click();
    }

    await expect(page.getByText(/3 invoices/i)).toBeVisible();
    await expect(page.getByText(`Invoice Customer ${stamp}`).first()).toBeVisible();

    await page.locator("#invoices-search").fill("INV-000002");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(/q=INV-000002/);
    await expect(page.getByText(/1 invoice/i)).toBeVisible();

    await page.goto("/invoices");
    await page.goto("/invoices?pageSize=2");
    await expect(page.getByText(/Showing 1–2 of 3/i)).toBeVisible();
    await page.getByRole("link", { name: "Next" }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByText(/Showing 3–3 of 3/i)).toBeVisible();

    await page.getByRole("link", { name: /INV-00000/i }).first().click();
    await expect(page).toHaveURL(/\/invoices\/[a-f0-9]{24}/i);
    await page.getByRole("link", { name: "Edit" }).click();
    await expect(page).toHaveURL(/\/edit$/);
    await page.locator("#invoice-status").selectOption("sent");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText(/Sent/i).first()).toBeVisible();

    await signOut(page);
  });

  test("demo can view invoices but cannot create or edit", async ({ page }) => {
    await exploreDemo(page);

    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Invoices" })
      .click();
    await expect(page).toHaveURL(/\/invoices/);
    await expect(page.locator("#invoices-heading")).toBeVisible();
    await expect(page.getByText(/Demo accounts can view/i)).toBeVisible();
    await expect(page.getByRole("link", { name: "Add invoice" })).toHaveCount(0);

    await page.goto("/invoices/new");
    await expect(
      page.getByText(/do not have permission to create invoices/i),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create invoice" }),
    ).toHaveCount(0);
  });

  test("mobile invoices pages have no horizontal overflow", async ({ page }) => {
    await exploreDemo(page);
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto("/invoices");
    await expect(page.locator("#invoices-heading")).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.goto("/invoices/new");
    await expect(page.locator("#new-invoice-heading")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
