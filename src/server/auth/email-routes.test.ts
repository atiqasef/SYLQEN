import { describe, expect, it } from "vitest";

import { requiresOutboundEmail } from "@/server/auth/email-routes";

describe("requiresOutboundEmail", () => {
  it("does not gate sign-up or sign-in (no mandatory verification)", () => {
    expect(requiresOutboundEmail("/api/auth/sign-up/email")).toBe(false);
    expect(requiresOutboundEmail("/api/auth/sign-in/email")).toBe(false);
  });

  it("still gates optional verification and password-recovery paths", () => {
    expect(requiresOutboundEmail("/api/auth/send-verification-email")).toBe(
      true,
    );
    expect(requiresOutboundEmail("/api/auth/forget-password")).toBe(true);
    expect(requiresOutboundEmail("/api/auth/request-password-reset")).toBe(
      true,
    );
  });
});
