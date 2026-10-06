import { afterEach, describe, expect, it } from "vitest";

import { resetServerEnvCache } from "@/config/env";
import { AppError } from "@/lib/errors/app-error";
import { ensureDemoAccount } from "@/server/auth/demo";

describe("ensureDemoAccount configuration boundary", () => {
  afterEach(() => {
    resetServerEnvCache();
    Reflect.deleteProperty(process.env, "DEMO_EMAIL");
    Reflect.deleteProperty(process.env, "DEMO_PASSWORD");
    Reflect.deleteProperty(process.env, "DEMO_NAME");
  });

  it("fails closed when DEMO_* env vars are missing", async () => {
    await expect(ensureDemoAccount()).rejects.toBeInstanceOf(AppError);

    try {
      await ensureDemoAccount();
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).message).toMatch(/Demo credentials are not configured/);
      expect((error as AppError).message).not.toMatch(/@/);
    }
  });
});
