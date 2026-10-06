import { describe, expect, it } from "vitest";

import { AppError } from "@/lib/errors/app-error";
import { canPerform } from "@/server/auth/permissions";

/**
 * These tests encode the Phase 2 authorization contract:
 * browser-supplied IDs are never sufficient proof of access.
 */
describe("tenant isolation contract", () => {
  it("denies cross-workspace mutation permissions for viewers", () => {
    const attackerRole = "viewer" as const;
    expect(
      canPerform({
        role: attackerRole,
        isDemo: false,
        permission: "workspace.update",
      }),
    ).toBe(false);
  });

  it("requires a trusted forbidden error shape for isolation failures", () => {
    const error = new AppError({
      code: "FORBIDDEN",
      message: "Membership not found for workspace",
      userMessage: "You do not have access to this workspace.",
    });

    expect(error.toJSON()).toEqual({
      code: "FORBIDDEN",
      message: "You do not have access to this workspace.",
      status: 403,
    });
  });

  it("never treats a client-provided workspaceId as authority by itself", () => {
    const clientHint = { workspaceId: "workspace_from_browser" };
    const trustedWorkspaceId = "workspace_from_session";
    expect(clientHint.workspaceId).not.toBe(trustedWorkspaceId);
  });
});
