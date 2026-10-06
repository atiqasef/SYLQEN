import { afterEach, describe, expect, it } from "vitest";

import { getServerEnv, resetServerEnvCache } from "@/config/env";

describe("getServerEnv", () => {
  afterEach(() => {
    resetServerEnvCache();
    delete process.env.AI_ENABLED;
    delete process.env.AI_PROVIDER;
    delete process.env.LOG_LEVEL;
  });

  it("defaults AI to disabled with mock provider", () => {
    const env = getServerEnv();
    expect(env.AI_ENABLED).toBe(false);
    expect(env.AI_PROVIDER).toBe("mock");
  });

  it("parses AI_ENABLED=true", () => {
    process.env.AI_ENABLED = "true";
    process.env.AI_PROVIDER = "mock";
    const env = getServerEnv();
    expect(env.AI_ENABLED).toBe(true);
  });
});
