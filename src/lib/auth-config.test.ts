import { afterEach, describe, expect, it } from "vitest";

import {
  isGoogleOAuthConfigured,
  publicEnv,
  resetServerEnvCache,
} from "@/config/env";
import { buildGoogleSocialProviders } from "@/lib/auth-social";

describe("Google OAuth configuration boundary", () => {
  afterEach(() => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    resetServerEnvCache();
  });

  it("stays disabled until both client id and secret exist", () => {
    resetServerEnvCache();
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    resetServerEnvCache();

    expect(isGoogleOAuthConfigured()).toBe(false);
    expect(buildGoogleSocialProviders()).toEqual({});

    process.env.GOOGLE_CLIENT_ID = "id-only";
    resetServerEnvCache();
    expect(isGoogleOAuthConfigured()).toBe(false);
    expect(buildGoogleSocialProviders()).toEqual({});

    process.env.GOOGLE_CLIENT_SECRET = "test-google-client-secret";
    resetServerEnvCache();
    expect(isGoogleOAuthConfigured()).toBe(true);
    expect(buildGoogleSocialProviders()).toEqual({
      google: {
        clientId: "id-only",
        clientSecret: "test-google-client-secret",
      },
    });
  });

  it("keeps Google credentials out of the public env surface", () => {
    expect(publicEnv).not.toHaveProperty("GOOGLE_CLIENT_ID");
    expect(publicEnv).not.toHaveProperty("GOOGLE_CLIENT_SECRET");
    expect(
      Object.keys(publicEnv).some((key) => key.includes("GOOGLE")),
    ).toBe(false);
  });
});
