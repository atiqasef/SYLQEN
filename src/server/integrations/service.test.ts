import { describe, expect, it } from "vitest";

import { AppError } from "@/lib/errors/app-error";
import { effectivePermissions } from "@/server/auth/permissions";
import type { SessionContext } from "@/server/auth/types";
import {
  getIntegrationBySlugForSession,
  getIntegrationsSnapshotForSession,
} from "@/server/integrations/service";

function sessionFor(options: {
  role: SessionContext["membership"]["role"];
  isDemo?: boolean;
  permissions?: SessionContext["membership"]["permissions"];
}): SessionContext {
  const isDemo = options.isDemo ?? false;
  return {
    user: {
      id: "user_1",
      email: "user@example.test",
      name: "User",
      emailVerified: true,
      isDemo,
    },
    workspace: {
      id: "ws_1",
      name: "Workspace",
      slug: "workspace",
    },
    membership: {
      id: "mem_1",
      workspaceId: "ws_1",
      userId: "user_1",
      role: isDemo ? "viewer" : options.role,
      permissions:
        options.permissions ??
        effectivePermissions({ role: options.role, isDemo }),
    },
  };
}

describe("integrations service", () => {
  it("returns a safe catalog for owners", () => {
    const snapshot = getIntegrationsSnapshotForSession(
      sessionFor({ role: "owner" }),
    );
    expect(snapshot.items.length).toBeGreaterThanOrEqual(6);
    for (const item of snapshot.items) {
      expect(item).not.toHaveProperty("apiKey");
      expect(item.supportsWorkspaceConnection).toBe(false);
    }
  });

  it("allows demo viewers to read integrations", () => {
    const snapshot = getIntegrationsSnapshotForSession(
      sessionFor({ role: "owner", isDemo: true }),
    );
    expect(snapshot.items.some((item) => item.key === "resend")).toBe(true);
  });

  it("rejects sessions without workspace.read", () => {
    expect(() =>
      getIntegrationsSnapshotForSession(
        sessionFor({ role: "owner", permissions: [] }),
      ),
    ).toThrow(
      expect.objectContaining({
        code: "FORBIDDEN",
      } satisfies Partial<AppError>),
    );
  });

  it("loads a single integration by slug", () => {
    const item = getIntegrationBySlugForSession(
      sessionFor({ role: "member" }),
      "ai",
    );
    expect(item.key).toBe("ai");
    expect(item.name).toBe("AI Assistant");
  });

  it("throws NOT_FOUND for unknown slugs", () => {
    expect(() =>
      getIntegrationBySlugForSession(sessionFor({ role: "owner" }), "zapier"),
    ).toThrow(
      expect.objectContaining({
        code: "NOT_FOUND",
      } satisfies Partial<AppError>),
    );
  });
});
