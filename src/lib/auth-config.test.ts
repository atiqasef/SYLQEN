import { afterEach, describe, expect, it } from "vitest";

import {
  isFacebookOAuthConfigured,
  isGoogleOAuthConfigured,
  publicEnv,
  resetServerEnvCache,
} from "@/config/env";
import {
  buildFacebookSocialProviders,
  buildGoogleSocialProviders,
  buildSocialProviders,
} from "@/lib/auth-social";

describe("OAuth configuration boundary", () => {
  afterEach(() => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.FACEBOOK_CLIENT_ID;
    delete process.env.FACEBOOK_CLIENT_SECRET;
    resetServerEnvCache();
  });

  it("keeps Google disabled until both client id and secret exist", () => {
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

  it("keeps Facebook disabled until both client id and secret exist", () => {
    resetServerEnvCache();
    delete process.env.FACEBOOK_CLIENT_ID;
    delete process.env.FACEBOOK_CLIENT_SECRET;
    resetServerEnvCache();

    expect(isFacebookOAuthConfigured()).toBe(false);
    expect(buildFacebookSocialProviders()).toEqual({});

    process.env.FACEBOOK_CLIENT_ID = "fb-id-only";
    resetServerEnvCache();
    expect(isFacebookOAuthConfigured()).toBe(false);
    expect(buildFacebookSocialProviders()).toEqual({});

    process.env.FACEBOOK_CLIENT_SECRET = "test-facebook-client-secret";
    resetServerEnvCache();
    expect(isFacebookOAuthConfigured()).toBe(true);
    expect(buildFacebookSocialProviders()).toEqual({
      facebook: {
        clientId: "fb-id-only",
        clientSecret: "test-facebook-client-secret",
      },
    });
  });

  it("merges Google and Facebook providers independently", () => {
    process.env.GOOGLE_CLIENT_ID = "google-id";
    process.env.GOOGLE_CLIENT_SECRET = "google-secret";
    resetServerEnvCache();

    expect(buildSocialProviders()).toEqual({
      google: {
        clientId: "google-id",
        clientSecret: "google-secret",
      },
    });

    process.env.FACEBOOK_CLIENT_ID = "facebook-id";
    process.env.FACEBOOK_CLIENT_SECRET = "facebook-secret";
    resetServerEnvCache();

    expect(buildSocialProviders()).toEqual({
      google: {
        clientId: "google-id",
        clientSecret: "google-secret",
      },
      facebook: {
        clientId: "facebook-id",
        clientSecret: "facebook-secret",
      },
    });

    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    resetServerEnvCache();

    expect(isGoogleOAuthConfigured()).toBe(false);
    expect(isFacebookOAuthConfigured()).toBe(true);
    expect(buildSocialProviders()).toEqual({
      facebook: {
        clientId: "facebook-id",
        clientSecret: "facebook-secret",
      },
    });
  });

  it("keeps OAuth credentials out of the public env surface", () => {
    expect(publicEnv).not.toHaveProperty("GOOGLE_CLIENT_ID");
    expect(publicEnv).not.toHaveProperty("GOOGLE_CLIENT_SECRET");
    expect(publicEnv).not.toHaveProperty("FACEBOOK_CLIENT_ID");
    expect(publicEnv).not.toHaveProperty("FACEBOOK_CLIENT_SECRET");
    expect(
      Object.keys(publicEnv).some(
        (key) => key.includes("GOOGLE") || key.includes("FACEBOOK"),
      ),
    ).toBe(false);
  });
});
