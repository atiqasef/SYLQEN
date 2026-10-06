import { afterEach, describe, expect, it } from "vitest";

import { AppError } from "@/lib/errors/app-error";
import { DevEmailProvider } from "@/server/email/dev-provider";

describe("DevEmailProvider production guard", () => {
  const previousVercelEnv = process.env.VERCEL_ENV;
  const previousVercel = process.env.VERCEL;

  afterEach(() => {
    if (previousVercelEnv === undefined) {
      Reflect.deleteProperty(process.env, "VERCEL_ENV");
    } else {
      process.env.VERCEL_ENV = previousVercelEnv;
    }

    if (previousVercel === undefined) {
      Reflect.deleteProperty(process.env, "VERCEL");
    } else {
      process.env.VERCEL = previousVercel;
    }
  });

  it("refuses to send in Vercel production", async () => {
    process.env.VERCEL_ENV = "production";
    const provider = new DevEmailProvider();

    await expect(
      provider.send({
        to: "user@example.com",
        subject: "Verify your SYLQEN email",
        html: "<p>verify</p>",
        text: "verify",
      }),
    ).rejects.toBeInstanceOf(AppError);

    try {
      await provider.send({
        to: "user@example.com",
        subject: "Verify your SYLQEN email",
        html: "<p>verify</p>",
        text: "verify",
      });
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).message).toMatch(/EMAIL_PROVIDER/);
      expect((error as AppError).message).not.toMatch(/user@example.com/);
    }
  });

  it("captures email outside production", async () => {
    Reflect.deleteProperty(process.env, "VERCEL_ENV");
    Reflect.deleteProperty(process.env, "VERCEL");
    const provider = new DevEmailProvider();

    await expect(
      provider.send({
        to: "user@example.com",
        subject: "Verify your SYLQEN email",
        html: "<p>verify</p>",
        text: "verify",
      }),
    ).resolves.toBeUndefined();
  });
});
