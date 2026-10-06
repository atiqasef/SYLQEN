import { describe, expect, it } from "vitest";

import {
  normalizeSku,
  productInputSchema,
  productListQuerySchema,
} from "@/features/products/schemas";
import { parseWithSchema } from "@/lib/validation/result";

describe("normalizeSku", () => {
  it("uppercases and collapses whitespace", () => {
    expect(normalizeSku("  svc hour 001 ")).toBe("SVC-HOUR-001");
  });
});

describe("productInputSchema", () => {
  it("accepts a valid product and normalizes sku/currency", () => {
    const result = parseWithSchema(productInputSchema, {
      name: "Consulting hour",
      sku: "svc-hour-001",
      price: "150.5",
      currency: "usd",
      unit: "hour",
      description: "Standard delivery unit",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.sku).toBe("SVC-HOUR-001");
      expect(result.data.currency).toBe("USD");
      expect(result.data.price).toBe(150.5);
    }
  });

  it("rejects empty name and SKU", () => {
    const result = parseWithSchema(productInputSchema, {
      name: " ",
      sku: "   ",
      price: 10,
      currency: "USD",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects negative price", () => {
    const result = parseWithSchema(productInputSchema, {
      name: "Item",
      sku: "ITEM-1",
      price: -1,
      currency: "USD",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects invalid currency", () => {
    const result = parseWithSchema(productInputSchema, {
      name: "Item",
      sku: "ITEM-1",
      price: 1,
      currency: "US",
    });
    expect(result.ok).toBe(false);
  });
});

describe("productListQuerySchema", () => {
  it("applies defaults", () => {
    const result = parseWithSchema(productListQuerySchema, {});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(20);
    }
  });
});
