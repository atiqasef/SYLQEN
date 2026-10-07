import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.hoisted(() => vi.fn());
const headersMock = vi.hoisted(() => vi.fn());
const connectMongoMock = vi.hoisted(() => vi.fn());
const isMongoConfiguredMock = vi.hoisted(() => vi.fn(() => true));
const getPrimaryWorkspaceForUserMock = vi.hoisted(() => vi.fn());
const ensureDefaultWorkspaceForUserMock = vi.hoisted(() => vi.fn());

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    /**
     * Vitest has no RSC request cache store. Shim `cache()` as a once-memoizer
     * so we can assert getSession is wired through React.cache for request
     * dedupe (Next.js provides the real request-scoped store in production).
     */
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
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
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

describe("getSession request memoization", () => {
  beforeEach(() => {
    vi.resetModules();
    getSessionMock.mockReset();
    headersMock.mockReset();
    connectMongoMock.mockReset();
    isMongoConfiguredMock.mockReset();
    getPrimaryWorkspaceForUserMock.mockReset();
    ensureDefaultWorkspaceForUserMock.mockReset();

    isMongoConfiguredMock.mockReturnValue(true);
    connectMongoMock.mockResolvedValue(undefined);
    headersMock.mockResolvedValue(new Headers());
  });

  it("deduplicates Better Auth + workspace lookups through React.cache wiring", async () => {
    const workspaceId = "507f1f77bcf86cd799439011";
    headersMock.mockResolvedValue(
      new Headers({ cookie: "better-auth.session_token=memo-token" }),
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

    const { getSession, requireVerifiedPageSession } = await import(
      "@/server/auth/session"
    );

    const [a, b, c] = await Promise.all([
      getSession(),
      getSession(),
      requireVerifiedPageSession(),
    ]);

    expect(a?.user.id).toBe("user_1");
    expect(b).toBe(a);
    expect(c).toBe(a);
    expect(getSessionMock).toHaveBeenCalledTimes(1);
    expect(getPrimaryWorkspaceForUserMock).toHaveBeenCalledTimes(1);
    expect(connectMongoMock).toHaveBeenCalledTimes(1);
  });
});
