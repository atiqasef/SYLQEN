import { afterEach, describe, expect, it } from "vitest";

import {
  getServerEnv,
  isDemoConfigured,
  isEmailDeliveryConfigured,
  isFacebookOAuthConfigured,
  isGoogleOAuthConfigured,
  resetServerEnvCache,
} from "@/config/env";

describe("getServerEnv", () => {
  afterEach(() => {
    resetServerEnvCache();
    delete process.env.AI_ENABLED;
    delete process.env.AI_PROVIDER;
    delete process.env.LOG_LEVEL;
    delete process.env.EMAIL_PROVIDER;
    delete process.env.RESEND_API_KEY;
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.FACEBOOK_CLIENT_ID;
    delete process.env.FACEBOOK_CLIENT_SECRET;
    delete process.env.DEMO_EMAIL;
    delete process.env.DEMO_PASSWORD;
  });

  it("defaults AI to disabled with mock provider", () => {
    const env = getServerEnv();
    expect(env.AI_ENABLED).toBe(false);
    expect(env.AI_PROVIDER).toBe("mock");
    expect(env.EMAIL_PROVIDER).toBe("dev");
  });

  it("parses AI_ENABLED=true", () => {
    process.env.AI_ENABLED = "true";
    process.env.AI_PROVIDER = "mock";
    const env = getServerEnv();
    expect(env.AI_ENABLED).toBe(true);
  });

  it("reports Google/Facebook OAuth and demo configuration boundaries", () => {
    expect(isGoogleOAuthConfigured()).toBe(false);
    expect(isFacebookOAuthConfigured()).toBe(false);
    expect(isDemoConfigured()).toBe(false);

    process.env.GOOGLE_CLIENT_ID = "google-client";
    process.env.GOOGLE_CLIENT_SECRET = "google-secret";
    process.env.FACEBOOK_CLIENT_ID = "facebook-client";
    process.env.FACEBOOK_CLIENT_SECRET = "facebook-secret";
    process.env.DEMO_EMAIL = "demo@sylqen.app";
    process.env.DEMO_PASSWORD = "demo-password-value";
    resetServerEnvCache();

    expect(isGoogleOAuthConfigured()).toBe(true);
    expect(isFacebookOAuthConfigured()).toBe(true);
    expect(isDemoConfigured()).toBe(true);
  });

  it("requires both EMAIL_PROVIDER=resend and RESEND_API_KEY for delivery", () => {
    expect(isEmailDeliveryConfigured()).toBe(false);

    process.env.EMAIL_PROVIDER = "resend";
    resetServerEnvCache();
    expect(isEmailDeliveryConfigured()).toBe(false);

    process.env.RESEND_API_KEY = "re_test_key";
    resetServerEnvCache();
    expect(isEmailDeliveryConfigured()).toBe(true);
  });
});
