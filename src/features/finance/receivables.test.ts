import { describe, expect, it } from "vitest";

import {
  prioritizeReceivables,
  receivablePriorityLabel,
} from "@/features/finance/receivables";
import type { DashboardOutstandingInvoice } from "@/server/dashboard/types";

function invoice(
  partial: Partial<DashboardOutstandingInvoice> &
    Pick<DashboardOutstandingInvoice, "id" | "dueDate" | "isOverdue">,
): DashboardOutstandingInvoice {
  return {
    invoiceNumber: `INV-${partial.id}`,
    customerNameSnapshot: "Acme",
    currency: "USD",
    total: 100,
    amountPaid: 0,
    remaining: 100,
    status: partial.isOverdue ? "overdue" : "sent",
    ...partial,
  };
}

describe("prioritizeReceivables", () => {
  const today = new Date(Date.UTC(2026, 2, 15)); // 2026-03-15

  it("orders overdue before due soon before outstanding", () => {
    const ranked = prioritizeReceivables(
      [
        invoice({ id: "1", dueDate: "2026-03-25", isOverdue: false }),
        invoice({ id: "2", dueDate: "2026-03-10", isOverdue: true }),
        invoice({ id: "3", dueDate: "2026-03-18", isOverdue: false }),
      ],
      today,
      7,
    );

    expect(ranked.map((row) => row.id)).toEqual(["2", "3", "1"]);
    expect(ranked.map((row) => row.priority)).toEqual([
      "overdue",
      "due_soon",
      "outstanding",
    ]);
  });

  it("labels priorities for display", () => {
    expect(receivablePriorityLabel("overdue")).toBe("Overdue");
    expect(receivablePriorityLabel("due_soon")).toBe("Due soon");
    expect(receivablePriorityLabel("outstanding")).toBe("Outstanding");
  });
});
