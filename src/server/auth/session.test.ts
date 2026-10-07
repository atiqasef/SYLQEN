import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.hoisted(() => vi.fn());
const headersMock = vi.hoisted(() => vi.fn());
const connectMongoMock = vi.hoisted(() => vi.fn());
const isMongoConfiguredMock = vi.hoisted(() => vi.fn(() => true));
const getPrimaryWorkspaceForUserMock = vi.hoisted(() => vi.fn());
const ensureDefaultWorkspaceForUserMock = vi.hoisted(() => vi.fn());
const redirectMock = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
);

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    cache: <Args extends unknown[], Return>(fn: (...args: Args) => Return) => {
      let memo: Return | undefined;
      let hasMemo = false;
      return (...args: Args) => {
        if (!hasMemo) {
          memo = fn(...args);
          hasMemo = true;
        }
        return memo as Return;
      };
    },
  };
});

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/lib/auth", () => ({
  getAuth: () => ({
    api: {
      getSession: getSessionMock,
    },
  }),
}));

vi.mock("@/server/db/mongodb", () => ({
  connectMongo: connectMongoMock,
  isMongoConfigured: isMongoConfiguredMock,
}));

vi.mock("@/server/workspaces/service", () => ({
  getPrimaryWorkspaceForUser: getPrimaryWorkspaceForUserMock,
  ensureDefaultWorkspaceForUser: ensureDefaultWorkspaceForUserMock,
}));

function cookieHeaders(cookie?: string) {
  return cookie ? new Headers({ cookie }) : new Headers();
}

describe("getSession anonymous short-circuit and redirects", () => {
  beforeEach(() => {
    vi.resetModules();
    getSessionMock.mockReset();
    headersMock.mockReset();
    connectMongoMock.mockReset();
    isMongoConfiguredMock.mockReset();
    getPrimaryWorkspaceForUserMock.mockReset();
    ensureDefaultWorkspaceForUserMock.mockReset();
    redirectMock.mockClear();

    isMongoConfiguredMock.mockReturnValue(true);
    connectMongoMock.mockResolvedValue(undefined);
  });

  it("skips Mongo and Better Auth when no session cookie is present", async () => {
    headersMock.mockResolvedValue(cookieHeaders());

    const { getSession } = await import("@/server/auth/session");
    const session = await getSession();

    expect(session).toBeNull();
    expect(connectMongoMock).not.toHaveBeenCalled();
    expect(getSessionMock).not.toHaveBeenCalled();
    expect(getPrimaryWorkspaceForUserMock).not.toHaveBeenCalled();
  });

  it("redirectIfAuthenticated is a no-op without a session cookie", async () => {
    headersMock.mockResolvedValue(cookieHeaders());

    const { redirectIfAuthenticated } = await import("@/server/auth/session");
    await expect(redirectIfAuthenticated()).resolves.toBeUndefined();
    expect(redirectMock).not.toHaveBeenCalled();
    expect(connectMongoMock).not.toHaveBeenCalled();
  });

  it("requireVerifiedPageSession redirects anonymous users to login without Mongo", async () => {
    headersMock.mockResolvedValue(cookieHeaders("theme=dark"));

    const { requireVerifiedPageSession } = await import(
      "@/server/auth/session"
    );
    await expect(requireVerifiedPageSession()).rejects.toThrow("REDIRECT:/login");
    expect(connectMongoMock).not.toHaveBeenCalled();
    expect(getSessionMock).not.toHaveBeenCalled();
  });

  it("validates Better Auth when a session cookie is present", async () => {
    const workspaceId = "507f1f77bcf86cd799439011";
    headersMock.mockResolvedValue(
      cookieHeaders("better-auth.session_token=valid-token"),
    );
    getSessionMock.mockResolvedValue({
      user: {
        id: "user_1",
        email: "owner@example.com",
        name: "Owner",
        emailVerified: true,
        isDemo: false,
      },
    });
    getPrimaryWorkspaceForUserMock.mockResolvedValue({
      workspace: {
        _id: { toHexString: () => workspaceId },
        name: "Acme",
        slug: "acme",
      },
      membership: {
        _id: { toHexString: () => "mem_1" },
        workspaceId,
        userId: "user_1",
        role: "owner",
      },
    });

    const { getSession, redirectIfAuthenticated } = await import(
      "@/server/auth/session"
    );

    const session = await getSession();
    expect(session?.user.id).toBe("user_1");
    expect(session?.membership.role).toBe("owner");
    expect(connectMongoMock).toHaveBeenCalledTimes(1);
    expect(getSessionMock).toHaveBeenCalledTimes(1);

    await expect(redirectIfAuthenticated()).rejects.toThrow("REDIRECT:/");
  });

  it("treats an invalid/expired Better Auth session as anonymous", async () => {
    headersMock.mockResolvedValue(
      cookieHeaders("better-auth.session_token=stale-token"),
    );
    getSessionMock.mockResolvedValue(null);

    const { getSession, requireVerifiedPageSession } = await import(
      "@/server/auth/session"
    );

    await expect(getSession()).resolves.toBeNull();
    expect(connectMongoMock).toHaveBeenCalledTimes(1);
    expect(getPrimaryWorkspaceForUserMock).not.toHaveBeenCalled();

    await expect(requireVerifiedPageSession()).rejects.toThrow("REDIRECT:/login");
  });

  it("caps demo accounts to viewer permissions after session validation", async () => {
    const workspaceId = "507f1f77bcf86cd799439012";
    headersMock.mockResolvedValue(
      cookieHeaders("__Secure-better-auth.session_token=demo"),
    );
    getSessionMock.mockResolvedValue({
      user: {
        id: "demo_1",
        email: "demo@example.com",
        name: "Demo",
        emailVerified: true,
        isDemo: true,
      },
    });
    getPrimaryWorkspaceForUserMock.mockResolvedValue({
      workspace: {
        _id: { toHexString: () => workspaceId },
        name: "Demo Workspace",
        slug: "demo",
      },
      membership: {
        _id: { toHexString: () => "mem_demo" },
        workspaceId,
        userId: "demo_1",
        role: "owner",
      },
    });

    const { getSession } = await import("@/server/auth/session");
    const session = await getSession();

    expect(session?.membership.role).toBe("viewer");
    expect(session?.membership.permissions).not.toContain("workspace.update");
    expect(session?.membership.permissions).toContain("customers.read");
  });
});
