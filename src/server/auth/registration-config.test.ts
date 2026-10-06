import { afterEach, describe, expect, it } from "vitest";
import { MongoClient } from "mongodb";

import {
  getAppBaseUrl,
  getTrustedOrigins,
  isEmailDeliveryConfigured,
  isProductionRuntime,
  normalizeAppUrl,
  resetServerEnvCache,
} from "@/config/env";
import { normalizeMongoUri } from "@/server/db/mongodb";

describe("app URL helpers", () => {
  afterEach(() => {
    resetServerEnvCache();
    delete process.env.BETTER_AUTH_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.VERCEL_ENV;
    delete process.env.VERCEL;
    delete process.env.EMAIL_PROVIDER;
    delete process.env.RESEND_API_KEY;
  });

  it("normalizes trailing slashes for origin matching", () => {
    expect(normalizeAppUrl("https://sylqen.vercel.app/")).toBe(
      "https://sylqen.vercel.app",
    );
    expect(normalizeAppUrl(" https://sylqen.vercel.app ")).toBe(
      "https://sylqen.vercel.app",
    );
  });

  it("builds trusted origins from auth and public URLs", () => {
    process.env.BETTER_AUTH_URL = "https://sylqen.vercel.app/";
    process.env.NEXT_PUBLIC_APP_URL = "https://sylqen.vercel.app";
    resetServerEnvCache();

    expect(getAppBaseUrl()).toBe("https://sylqen.vercel.app");
    expect(getTrustedOrigins()).toEqual(["https://sylqen.vercel.app"]);
  });

  it("detects production email delivery configuration", () => {
    expect(isEmailDeliveryConfigured()).toBe(false);

    process.env.EMAIL_PROVIDER = "resend";
    process.env.RESEND_API_KEY = "re_test_key";
    resetServerEnvCache();
    expect(isEmailDeliveryConfigured()).toBe(true);
  });

  it("detects Vercel production runtime", () => {
    expect(isProductionRuntime()).toBe(false);
    process.env.VERCEL_ENV = "production";
    expect(isProductionRuntime()).toBe(true);
  });
});

describe("percent-encoded MongoDB URI handling", () => {
  it("accepts a correctly percent-encoded Atlas-style URI", () => {
    const uri = normalizeMongoUri(
      '  "mongodb+srv://test_user:p%40ss%3Aword@cluster0.example.net/testdb"  ',
    );
    expect(uri).toBe(
      "mongodb+srv://test_user:p%40ss%3Aword@cluster0.example.net/testdb",
    );
    expect(() => new MongoClient(uri)).not.toThrow();
  });
});
