import { describe, expect, it } from "vitest";

import {
  customerInputSchema,
  customerListQuerySchema,
} from "@/features/customers/schemas";
import { parseWithSchema } from "@/lib/validation/result";

describe("customerInputSchema", () => {
  it("accepts a minimal valid customer", () => {
    const result = parseWithSchema(customerInputSchema, {
      name: "Ada Lovelace",
      email: "ada@example.com",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe("Ada Lovelace");
      expect(result.data.email).toBe("ada@example.com");
      expect(result.data.phone).toBeUndefined();
    }
  });

  it("rejects missing name and invalid email", () => {
    const result = parseWithSchema(customerInputSchema, {
      name: " ",
      email: "not-an-email",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
      expect(result.error.details?.fieldErrors).toBeTruthy();
    }
  });

  it("normalizes empty optional fields to undefined", () => {
    const result = parseWithSchema(customerInputSchema, {
      name: "Grace Hopper",
      email: "grace@example.com",
      phone: "  ",
      company: "",
      address: "   ",
      notes: "",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.phone).toBeUndefined();
      expect(result.data.company).toBeUndefined();
      expect(result.data.address).toBeUndefined();
      expect(result.data.notes).toBeUndefined();
    }
  });
});

describe("customerListQuerySchema", () => {
  it("applies defaults and bounds page size", () => {
    const result = parseWithSchema(customerListQuerySchema, {});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(20);
    }
  });

  it("rejects pathological page sizes", () => {
    const result = parseWithSchema(customerListQuerySchema, { pageSize: 500 });
    expect(result.ok).toBe(false);
  });

  it("trims and bounds search queries", () => {
    const result = parseWithSchema(customerListQuerySchema, {
      q: "  Acme  ",
      page: "2",
      pageSize: "10",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.q).toBe("Acme");
      expect(result.data.page).toBe(2);
      expect(result.data.pageSize).toBe(10);
    }
  });
});
