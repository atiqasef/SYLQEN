import { describe, expect, it } from "vitest";

import { paymentInputSchema, paymentListQuerySchema } from "./schemas";

describe("payment schemas", () => {
  it("accepts a valid payment payload", () => {
    const parsed = paymentInputSchema.safeParse({
      invoiceId: "64b64c4f2f1e2b001f1e2b00",
      amount: "42.50",
      paymentDate: "2026-03-15",
      method: "bank_transfer",
      reference: " TX-1 ",
      notes: " Paid in full ",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.amount).toBe(42.5);
      expect(parsed.data.reference).toBe("TX-1");
      expect(parsed.data.notes).toBe("Paid in full");
    }
  });

  it("rejects zero, negative, and over-precise amounts", () => {
    expect(
      paymentInputSchema.safeParse({
        invoiceId: "inv",
        amount: 0,
        paymentDate: "2026-01-01",
        method: "cash",
      }).success,
    ).toBe(false);

    expect(
      paymentInputSchema.safeParse({
        invoiceId: "inv",
        amount: -5,
        paymentDate: "2026-01-01",
        method: "cash",
      }).success,
    ).toBe(false);

    expect(
      paymentInputSchema.safeParse({
        invoiceId: "inv",
        amount: 1.001,
        paymentDate: "2026-01-01",
        method: "cash",
      }).success,
    ).toBe(false);
  });

  it("rejects invalid methods and dates", () => {
    expect(
      paymentInputSchema.safeParse({
        invoiceId: "inv",
        amount: 10,
        paymentDate: "2026-13-01",
        method: "cash",
      }).success,
    ).toBe(false);

    expect(
      paymentInputSchema.safeParse({
        invoiceId: "inv",
        amount: 10,
        paymentDate: "2026-01-01",
        method: "crypto",
      }).success,
    ).toBe(false);
  });

  it("normalizes list query defaults and bounds", () => {
    const parsed = paymentListQuerySchema.safeParse({});
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.page).toBe(1);
      expect(parsed.data.pageSize).toBe(20);
    }

    expect(paymentListQuerySchema.safeParse({ pageSize: 100 }).success).toBe(
      false,
    );
  });
});
