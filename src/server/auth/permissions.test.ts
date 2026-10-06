import { describe, expect, it } from "vitest";

import {
  canPerform,
  effectivePermissions,
  permissionsForRole,
} from "@/server/auth/permissions";

describe("RBAC permissions", () => {
  it("gives owners full workspace permission set", () => {
    expect(permissionsForRole("owner")).toContain("members.remove");
    expect(permissionsForRole("owner")).toContain("workspace.update");
    expect(permissionsForRole("owner")).toContain("payments.create");
  });

  it("keeps viewers read-only for workspace mutations", () => {
    expect(permissionsForRole("viewer")).toEqual([
      "workspace.read",
      "members.read",
      "customers.read",
      "products.read",
      "projects.read",
      "invoices.read",
      "payments.read",
    ]);
    expect(canPerform({ role: "viewer", isDemo: false, permission: "members.invite" })).toBe(
      false,
    );
    expect(
      canPerform({ role: "viewer", isDemo: false, permission: "customers.create" }),
    ).toBe(false);
    expect(
      canPerform({ role: "viewer", isDemo: false, permission: "products.create" }),
    ).toBe(false);
    expect(
      canPerform({ role: "viewer", isDemo: false, permission: "projects.create" }),
    ).toBe(false);
    expect(
      canPerform({ role: "viewer", isDemo: false, permission: "invoices.create" }),
    ).toBe(false);
    expect(
      canPerform({ role: "viewer", isDemo: false, permission: "payments.create" }),
    ).toBe(false);
  });

  it("caps demo accounts to viewer permissions even if stored as owner", () => {
    expect(
      effectivePermissions({ role: "owner", isDemo: true }),
    ).toEqual([
      "workspace.read",
      "members.read",
      "customers.read",
      "products.read",
      "projects.read",
      "invoices.read",
      "payments.read",
    ]);
    expect(
      canPerform({
        role: "owner",
        isDemo: true,
        permission: "workspace.update",
      }),
    ).toBe(false);
    expect(
      canPerform({
        role: "owner",
        isDemo: true,
        permission: "customers.create",
      }),
    ).toBe(false);
    expect(
      canPerform({
        role: "owner",
        isDemo: true,
        permission: "products.update",
      }),
    ).toBe(false);
    expect(
      canPerform({
        role: "owner",
        isDemo: true,
        permission: "projects.update",
      }),
    ).toBe(false);
    expect(
      canPerform({
        role: "owner",
        isDemo: true,
        permission: "invoices.update",
      }),
    ).toBe(false);
    expect(
      canPerform({
        role: "owner",
        isDemo: true,
        permission: "payments.create",
      }),
    ).toBe(false);
  });

  it("allows members to manage customers, products, projects, invoices, and payments", () => {
    expect(
      canPerform({ role: "member", isDemo: false, permission: "customers.create" }),
    ).toBe(true);
    expect(
      canPerform({ role: "member", isDemo: false, permission: "customers.update" }),
    ).toBe(true);
    expect(
      canPerform({ role: "member", isDemo: false, permission: "products.create" }),
    ).toBe(true);
    expect(
      canPerform({ role: "member", isDemo: false, permission: "products.update" }),
    ).toBe(true);
    expect(
      canPerform({ role: "member", isDemo: false, permission: "projects.create" }),
    ).toBe(true);
    expect(
      canPerform({ role: "member", isDemo: false, permission: "projects.update" }),
    ).toBe(true);
    expect(
      canPerform({ role: "member", isDemo: false, permission: "invoices.create" }),
    ).toBe(true);
    expect(
      canPerform({ role: "member", isDemo: false, permission: "invoices.update" }),
    ).toBe(true);
    expect(
      canPerform({ role: "member", isDemo: false, permission: "payments.read" }),
    ).toBe(true);
    expect(
      canPerform({ role: "member", isDemo: false, permission: "payments.create" }),
    ).toBe(true);
  });
});
