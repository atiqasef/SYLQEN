import { expect, test } from "@playwright/test";

import {
  expectNoHorizontalOverflow,
  exploreDemo,
  registerUser,
  signOut,
} from "./helpers";

test.describe("products module", () => {
  test("authenticated user can create, search, paginate, edit, and view products", async ({
    page,
  }) => {
    const stamp = Date.now();
    await registerUser(page, {
      name: "Product Owner",
      email: `product-owner-${stamp}@example.test`,
      password: "e2e-local-password-1",
    });

    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Products" })
      .click();
    await expect(page).toHaveURL(/\/products/);
    await expect(page.locator("#products-heading")).toBeVisible();
    await expect(page.getByText(/No products yet/i)).toBeVisible();

    for (let i = 0; i < 3; i += 1) {
      await page.getByRole("link", { name: "Add product" }).first().click();
      await expect(page).toHaveURL(/\/products\/new/);
      await page.locator("#product-name").fill(`Product ${i} ${stamp}`);
      await page.locator("#product-sku").fill(`SKU-${i}-${stamp}`);
      await page.locator("#product-price").fill(String(100 + i));
      await page.locator("#product-currency").fill("USD");
      await page
        .locator("#product-description")
        .fill(i === 1 ? "Searchable description kit" : "Other product");
      await page.getByRole("button", { name: "Create product" }).click();
      await expect(page).toHaveURL(/\/products\/[a-f0-9]{24}/i);
      await expect(
        page.getByRole("heading", { name: `Product ${i} ${stamp}` }),
      ).toBeVisible();
      await page.getByRole("link", { name: "Back to products" }).click();
    }

    await expect(page.getByText(/3 products/i)).toBeVisible();

    await page.locator("#products-search").fill("Searchable description");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(/q=Searchable/);
    await expect(page.getByText(/1 product/i)).toBeVisible();
    await expect(
      page.getByRole("link", { name: `Product 1 ${stamp}` }),
    ).toBeVisible();

    await page.goto("/products");
    await expect(page.getByText(/3 products/i)).toBeVisible();

    await page.goto("/products?pageSize=2");
    await expect(page.getByText(/Showing 1–2 of 3/i)).toBeVisible();
    await page.getByRole("link", { name: "Next" }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByText(/Showing 3–3 of 3/i)).toBeVisible();

    await page
      .getByRole("link", { name: new RegExp(`Product .* ${stamp}`) })
      .first()
      .click();
    await expect(page).toHaveURL(/\/products\/[a-f0-9]{24}/i);
    await page.getByRole("link", { name: "Edit" }).click();
    await expect(page).toHaveURL(/\/edit$/);
    await page.locator("#product-name").fill(`Edited Product ${stamp}`);
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(
      page.getByRole("heading", { name: `Edited Product ${stamp}` }),
    ).toBeVisible();

    await signOut(page);
  });

  test("demo can view products but cannot create or edit", async ({ page }) => {
    await exploreDemo(page);

    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Products" })
      .click();
    await expect(page).toHaveURL(/\/products/);
    await expect(page.locator("#products-heading")).toBeVisible();
    await expect(page.getByText(/Demo accounts can view/i)).toBeVisible();
    await expect(page.getByRole("link", { name: "Add product" })).toHaveCount(0);

    await page.goto("/products/new");
    await expect(
      page.getByText(/do not have permission to create products/i),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create product" }),
    ).toHaveCount(0);
  });

  test("mobile products page has no horizontal overflow", async ({ page }) => {
    await exploreDemo(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/products");
    await expect(page.locator("#products-heading")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
