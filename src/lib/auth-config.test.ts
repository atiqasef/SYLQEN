import { describe, expect, it } from "vitest";

import { isGoogleOAuthConfigured, resetServerEnvCache } from "@/config/env";

describe("Google OAuth configuration boundary", () => {
  it("stays disabled until both client id and secret exist", () => {
    resetServerEnvCache();
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    resetServerEnvCache();

    expect(isGoogleOAuthConfigured()).toBe(false);

    process.env.GOOGLE_CLIENT_ID = "id-only";
    resetServerEnvCache();
    expect(isGoogleOAuthConfigured()).toBe(false);

    process.env.GOOGLE_CLIENT_SECRET = "secret";
    resetServerEnvCache();
    expect(isGoogleOAuthConfigured()).toBe(true);

    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    resetServerEnvCache();
  });
});
