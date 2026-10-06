import { describe, expect, it } from "vitest";

import { EMAIL_VERIFICATION_REQUIRED } from "@/lib/auth-policy";

describe("auth email verification policy", () => {
  it("keeps mandatory email verification disabled for portfolio stage", () => {
    expect(EMAIL_VERIFICATION_REQUIRED).toBe(false);
  });
});
