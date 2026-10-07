import { expect, test } from "@playwright/test";

import {
  expectNoHorizontalOverflow,
  exploreDemo,
  registerUser,
  signOut,
} from "./helpers";

test.describe("projects module", () => {
  test("authenticated user can create, search, paginate, edit, and view projects", async ({
    page,
  }) => {
    const stamp = Date.now();
    await registerUser(page, {
      name: "Project Owner",
      email: `project-owner-${stamp}@example.test`,
      password: "e2e-local-password-1",
    });

    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Projects" })
      .click();
    await expect(page).toHaveURL(/\/projects/);
    await expect(page.locator("#projects-heading")).toBeVisible();
    await expect(page.getByText(/No projects yet/i)).toBeVisible();

    for (let i = 0; i < 3; i += 1) {
      await page.getByRole("link", { name: "Add project" }).first().click();
      await expect(page).toHaveURL(/\/projects\/new/);
      await page.locator("#project-name").fill(`Project ${i} ${stamp}`);
      await page.locator("#project-status").selectOption("active");
      await page.locator("#project-client").fill(i === 1 ? "Searchable Client" : "Other Client");
      await page
        .locator("#project-description")
        .fill(i === 1 ? "Searchable description kit" : "Other project");
      await page.locator("#project-start-date").fill("2026-01-01");
      await page.locator("#project-due-date").fill("2026-02-01");
      await page.getByRole("button", { name: "Create project" }).click();
      await expect(page).toHaveURL(/\/projects\/[a-f0-9]{24}/i);
      await expect(
        page.getByRole("heading", { name: `Project ${i} ${stamp}` }),
      ).toBeVisible();
      await page.getByRole("link", { name: "Back to projects" }).click();
    }

    await expect(page.getByText(/3 projects/i)).toBeVisible();

    await page.locator("#projects-search").fill("Searchable description");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(/q=Searchable/);
    await expect(page.getByText(/1 project/i)).toBeVisible();
    await expect(
      page.getByRole("link", { name: `Project 1 ${stamp}` }),
    ).toBeVisible();

    await page.goto("/projects");
    await expect(page.getByText(/3 projects/i)).toBeVisible();

    await page.goto("/projects?pageSize=2");
    await expect(page.getByText(/Showing 1–2 of 3/i)).toBeVisible();
    await page.getByRole("link", { name: "Next" }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByText(/Showing 3–3 of 3/i)).toBeVisible();

    await page
      .getByRole("link", { name: new RegExp(`Project .* ${stamp}`) })
      .first()
      .click();
    await expect(page).toHaveURL(/\/projects\/[a-f0-9]{24}/i);
    await page.getByRole("link", { name: "Edit" }).click();
    await expect(page).toHaveURL(/\/edit$/);
    await page.locator("#project-name").fill(`Edited Project ${stamp}`);
    await page.locator("#project-status").selectOption("completed");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(
      page.getByRole("heading", { name: `Edited Project ${stamp}` }),
    ).toBeVisible();
    await expect(page.getByText(/Completed/i).first()).toBeVisible();

    await signOut(page);
  });

  test("demo can view projects but cannot create or edit", async ({ page }) => {
    await exploreDemo(page);

    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Projects" })
      .click();
    await expect(page).toHaveURL(/\/projects/);
    await expect(page.locator("#projects-heading")).toBeVisible();
    await expect(page.getByText(/Demo accounts can view/i)).toBeVisible();
    await expect(page.getByRole("link", { name: "Add project" })).toHaveCount(0);

    await page.goto("/projects/new");
    await expect(
      page.getByText(/do not have permission to create projects/i),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create project" }),
    ).toHaveCount(0);
  });

  test("mobile projects page has no horizontal overflow", async ({ page }) => {
    await exploreDemo(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/projects");
    await expect(page.locator("#projects-heading")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
