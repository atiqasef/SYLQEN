import { expect, test } from "@playwright/test";

import {
  expectNoHorizontalOverflow,
  exploreDemo,
  registerUser,
  signOut,
} from "./helpers";

test.describe("customers module", () => {
  test("authenticated user can create, search, paginate, edit, and view customers", async ({
    page,
  }) => {
    const stamp = Date.now();
    await registerUser(page, {
      name: "Customer Owner",
      email: `customer-owner-${stamp}@example.test`,
      password: "e2e-local-password-1",
    });

    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Customers" })
      .click();
    await expect(page).toHaveURL(/\/customers/);
    await expect(page.locator("#customers-heading")).toBeVisible();
    await expect(page.getByText(/No customers yet/i)).toBeVisible();

    for (let i = 0; i < 3; i += 1) {
      await page.getByRole("link", { name: "Add customer" }).first().click();
      await expect(page).toHaveURL(/\/customers\/new/);
      await page.locator("#customer-name").fill(`Customer ${i} ${stamp}`);
      await page
        .locator("#customer-email")
        .fill(`customer-${i}-${stamp}@example.test`);
      await page.locator("#customer-company").fill(i === 1 ? "Searchable Co" : "Other Co");
      await page.getByRole("button", { name: "Create customer" }).click();
      await expect(page).toHaveURL(/\/customers\/[a-f0-9]{24}/i);
      await expect(
        page.getByRole("heading", { name: `Customer ${i} ${stamp}` }),
      ).toBeVisible();
      await page.getByRole("link", { name: "Back to customers" }).click();
    }

    await expect(page.getByText(/3 customers/i)).toBeVisible();

    await page.locator("#customers-search").fill("Searchable Co");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(/q=Searchable/);
    await expect(page.getByText(/1 customer/i)).toBeVisible();
    await expect(page.getByRole("link", { name: `Customer 1 ${stamp}` })).toBeVisible();

    await page.goto("/customers");
    await expect(page.getByText(/3 customers/i)).toBeVisible();

    await page.goto("/customers?pageSize=2");
    await expect(page.getByText(/Showing 1–2 of 3/i)).toBeVisible();
    await page.getByRole("link", { name: "Next" }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByText(/Showing 3–3 of 3/i)).toBeVisible();

    await page.getByRole("link", { name: new RegExp(`Customer .* ${stamp}`) }).first().click();
    await expect(page).toHaveURL(/\/customers\/[a-f0-9]{24}/i);
    await page.getByRole("link", { name: "Edit" }).click();
    await expect(page).toHaveURL(/\/edit$/);
    await page.locator("#customer-name").fill(`Edited Customer ${stamp}`);
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(
      page.getByRole("heading", { name: `Edited Customer ${stamp}` }),
    ).toBeVisible();

    await signOut(page);
  });

  test("demo can view customers but cannot create or edit", async ({ page }) => {
    await exploreDemo(page);

    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Customers" })
      .click();
    await expect(page).toHaveURL(/\/customers/);
    await expect(page.locator("#customers-heading")).toBeVisible();
    await expect(page.getByText(/Demo accounts can view/i)).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Add customer" }),
    ).toHaveCount(0);

    await page.goto("/customers/new");
    await expect(
      page.getByText(/do not have permission to create customers/i),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create customer" }),
    ).toHaveCount(0);
  });

  test("mobile customers page has no horizontal overflow", async ({ page }) => {
    await exploreDemo(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/customers");
    await expect(page.locator("#customers-heading")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
