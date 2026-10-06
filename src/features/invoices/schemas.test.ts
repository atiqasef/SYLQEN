import { describe, expect, it } from "vitest";

import { calculateLineTotal, sumMoney } from "@/features/invoices/money";
import {
  formatInvoiceNumber,
  invoiceInputSchema,
  invoiceListQuerySchema,
} from "@/features/invoices/schemas";
import { parseWithSchema } from "@/lib/validation/result";

describe("invoice money helpers", () => {
  it("calculates line totals and sums with cents precision", () => {
    expect(calculateLineTotal(3, 19.99)).toBe(59.97);
    expect(sumMoney([0.1, 0.2])).toBe(0.3);
  });
});

describe("formatInvoiceNumber", () => {
  it("pads sequences", () => {
    expect(formatInvoiceNumber(1)).toBe("INV-000001");
    expect(formatInvoiceNumber(42)).toBe("INV-000042");
  });
});

describe("invoiceInputSchema", () => {
  const valid = {
    customerId: "507f1f77bcf86cd799439011",
    status: "draft",
    issueDate: "2026-01-10",
    dueDate: "2026-01-20",
    currency: "usd",
    lineItems: [{ productId: "507f1f77bcf86cd799439012", quantity: 2 }],
  };

  it("accepts a valid invoice and normalizes currency", () => {
    const result = parseWithSchema(invoiceInputSchema, valid);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.currency).toBe("USD");
      expect(result.data.status).toBe("draft");
    }
  });

  it("rejects missing line items", () => {
    const result = parseWithSchema(invoiceInputSchema, {
      ...valid,
      lineItems: [],
    });
    expect(result.ok).toBe(false);
  });

  it("rejects non-positive quantity", () => {
    const result = parseWithSchema(invoiceInputSchema, {
      ...valid,
      lineItems: [{ productId: "507f1f77bcf86cd799439012", quantity: 0 }],
    });
    expect(result.ok).toBe(false);
  });

  it("rejects invalid status", () => {
    const result = parseWithSchema(invoiceInputSchema, {
      ...valid,
      status: "void",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects due date before issue date", () => {
    const result = parseWithSchema(invoiceInputSchema, {
      ...valid,
      issueDate: "2026-02-01",
      dueDate: "2026-01-01",
    });
    expect(result.ok).toBe(false);
  });
});

describe("invoiceListQuerySchema", () => {
  it("applies defaults", () => {
    const result = parseWithSchema(invoiceListQuerySchema, {});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(20);
    }
  });
});
