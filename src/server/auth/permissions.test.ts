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
  });

  it("keeps viewers read-only for workspace mutations", () => {
    expect(permissionsForRole("viewer")).toEqual([
      "workspace.read",
      "members.read",
      "customers.read",
    ]);
    expect(canPerform({ role: "viewer", isDemo: false, permission: "members.invite" })).toBe(
      false,
    );
    expect(
      canPerform({ role: "viewer", isDemo: false, permission: "customers.create" }),
    ).toBe(false);
  });

  it("caps demo accounts to viewer permissions even if stored as owner", () => {
    expect(
      effectivePermissions({ role: "owner", isDemo: true }),
    ).toEqual(["workspace.read", "members.read", "customers.read"]);
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
  });

  it("allows members to manage customers", () => {
    expect(
      canPerform({ role: "member", isDemo: false, permission: "customers.create" }),
    ).toBe(true);
    expect(
      canPerform({ role: "member", isDemo: false, permission: "customers.update" }),
    ).toBe(true);
  });
});
