import { describe, expect, it } from "vitest";

import { hasBetterAuthSessionCookie } from "@/server/auth/session-cookie";

describe("hasBetterAuthSessionCookie", () => {
  it("returns false when Cookie header is missing", () => {
    expect(hasBetterAuthSessionCookie(new Headers())).toBe(false);
  });

  it("returns false when Cookie header has unrelated cookies only", () => {
    expect(
      hasBetterAuthSessionCookie(
        new Headers({ cookie: "theme=dark; other=1" }),
      ),
    ).toBe(false);
  });

  it("returns true for the standard Better Auth session cookie name", () => {
    expect(
      hasBetterAuthSessionCookie(
        new Headers({ cookie: "better-auth.session_token=abc123" }),
      ),
    ).toBe(true);
  });

  it("returns true for the secure-prefixed Better Auth session cookie", () => {
    expect(
      hasBetterAuthSessionCookie(
        new Headers({
          cookie: "__Secure-better-auth.session_token=securetoken",
        }),
      ),
    ).toBe(true);
  });
});
