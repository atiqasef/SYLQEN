import { beforeEach, describe, expect, it } from "vitest";

import {
  clearDevEmailOutbox,
  DevEmailProvider,
  findLatestDevEmail,
} from "@/server/email/dev-provider";

describe("DevEmailProvider", () => {
  beforeEach(() => {
    clearDevEmailOutbox();
    delete process.env.VERCEL_ENV;
    delete process.env.VERCEL;
  });

  it("captures emails without requiring an external provider", async () => {
    const provider = new DevEmailProvider();
    await provider.send({
      to: "user@example.com",
      subject: "Verify your SYLQEN email",
      text: "Click https://example.com/verify?token=secret-token",
      html: "<p>verify</p>",
    });

    const latest = findLatestDevEmail("user@example.com");
    expect(latest?.subject).toMatch(/Verify/i);
    expect(latest?.text).toContain("token=secret-token");
  });
});
