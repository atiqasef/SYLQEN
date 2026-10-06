import { describe, expect, it } from "vitest";
import { z } from "zod";

import { parseWithSchema } from "@/lib/validation/result";

describe("parseWithSchema", () => {
  const schema = z.object({
    email: z.string().email(),
  });

  it("returns ok data for valid input", () => {
    const result = parseWithSchema(schema, { email: "ops@sylqen.app" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.email).toBe("ops@sylqen.app");
    }
  });

  it("returns a safe validation error for invalid input", () => {
    const result = parseWithSchema(schema, { email: "not-an-email" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
      expect(result.error.toJSON().message).not.toMatch(/Zod/i);
    }
  });
});
