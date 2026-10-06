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

  it("keeps viewers read-only", () => {
    expect(permissionsForRole("viewer")).toEqual([
      "workspace.read",
      "members.read",
    ]);
    expect(canPerform({ role: "viewer", isDemo: false, permission: "members.invite" })).toBe(
      false,
    );
  });

  it("caps demo accounts to viewer permissions even if stored as owner", () => {
    expect(
      effectivePermissions({ role: "owner", isDemo: true }),
    ).toEqual(["workspace.read", "members.read"]);
    expect(
      canPerform({
        role: "owner",
        isDemo: true,
        permission: "workspace.update",
      }),
    ).toBe(false);
  });
});
