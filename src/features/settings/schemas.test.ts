import { describe, expect, it } from "vitest";

import {
  updateAccountNameSchema,
  updateWorkspaceNameSchema,
} from "@/features/settings/schemas";
import { parseWithSchema } from "@/lib/validation/result";

describe("updateWorkspaceNameSchema", () => {
  it("accepts a valid workspace name", () => {
    const result = parseWithSchema(updateWorkspaceNameSchema, {
      name: "  Acme Operations  ",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe("Acme Operations");
    }
  });

  it("rejects names that are too short", () => {
    const result = parseWithSchema(updateWorkspaceNameSchema, { name: "A" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });
});

describe("updateAccountNameSchema", () => {
  it("accepts a valid account name", () => {
    const result = parseWithSchema(updateAccountNameSchema, {
      name: " Ada Lovelace ",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe("Ada Lovelace");
    }
  });

  it("rejects blank names", () => {
    const result = parseWithSchema(updateAccountNameSchema, { name: "   " });
    expect(result.ok).toBe(false);
  });
});
