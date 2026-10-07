import { describe, expect, it } from "vitest";

import { buildFinanceActivity } from "@/features/finance/activity";

describe("buildFinanceActivity", () => {
  it("merges payments and invoices newest-first without inventing rows", () => {
    const items = buildFinanceActivity({
      payments: [
        {
          id: "pay1",
          amount: 50,
          currency: "USD",
          invoiceId: "inv1",
          invoiceNumberSnapshot: "INV-000001",
          customerNameSnapshot: "Ada",
          method: "card",
          paymentDate: "2026-03-12",
        },
      ],
      invoices: [
        {
          id: "inv1",
          invoiceNumber: "INV-000001",
          customerNameSnapshot: "Ada",
          status: "paid",
          total: 50,
          currency: "USD",
          issueDate: "2026-03-10",
          dueDate: "2026-03-20",
        },
        {
          id: "inv2",
          invoiceNumber: "INV-000002",
          customerNameSnapshot: "Grace",
          status: "sent",
          total: 80,
          currency: "USD",
          issueDate: "2026-03-11",
          dueDate: "2026-03-25",
        },
      ],
      limit: 10,
    });

    expect(items[0]?.kind).toBe("payment_received");
    expect(items.some((item) => item.kind === "invoice_paid")).toBe(true);
    expect(items.some((item) => item.kind === "invoice_issued")).toBe(true);
    expect(items).toHaveLength(3);
  });

  it("respects the activity limit", () => {
    const items = buildFinanceActivity({
      payments: [],
      invoices: [
        {
          id: "a",
          invoiceNumber: "INV-1",
          customerNameSnapshot: "A",
          status: "sent",
          total: 1,
          currency: "USD",
          issueDate: "2026-03-10",
          dueDate: "2026-03-20",
        },
        {
          id: "b",
          invoiceNumber: "INV-2",
          customerNameSnapshot: "B",
          status: "sent",
          total: 2,
          currency: "USD",
          issueDate: "2026-03-09",
          dueDate: "2026-03-19",
        },
      ],
      limit: 1,
    });
    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe("invoice:a");
  });
});
