import { describe, expect, it } from "vitest";

import { requiresOutboundEmail } from "@/server/auth/email-routes";

describe("requiresOutboundEmail", () => {
  it("flags registration and recovery paths that must send email", () => {
    expect(requiresOutboundEmail("/api/auth/sign-up/email")).toBe(true);
    expect(requiresOutboundEmail("/api/auth/send-verification-email")).toBe(
      true,
    );
    expect(requiresOutboundEmail("/api/auth/forget-password")).toBe(true);
    expect(requiresOutboundEmail("/api/auth/request-password-reset")).toBe(
      true,
    );
    expect(requiresOutboundEmail("/api/auth/sign-in/email")).toBe(false);
  });
});
