import type { DashboardOutstandingInvoice } from "@/server/dashboard/types";

export type ReceivablePriority = "overdue" | "due_soon" | "outstanding";

export type PrioritizedReceivable = DashboardOutstandingInvoice & {
  priority: ReceivablePriority;
};

/** Inclusive UTC calendar horizon for "due soon" (default 7 days). */
export function utcDueSoonEnd(
  todayStart: Date,
  daysAhead = 7,
): Date {
  return new Date(
    Date.UTC(
      todayStart.getUTCFullYear(),
      todayStart.getUTCMonth(),
      todayStart.getUTCDate() + daysAhead,
    ),
  );
}

/**
 * Classify outstanding invoices for Finance receivables.
 * Priority: overdue → due soon (within horizon) → other outstanding.
 * Does not invent balances — uses server-provided remaining/isOverdue.
 */
export function prioritizeReceivables(
  invoices: DashboardOutstandingInvoice[],
  todayStart: Date,
  dueSoonDays = 7,
): PrioritizedReceivable[] {
  const dueSoonEnd = utcDueSoonEnd(todayStart, dueSoonDays);

  const ranked = invoices.map((invoice) => {
    let priority: ReceivablePriority = "outstanding";
    if (invoice.isOverdue) {
      priority = "overdue";
    } else {
      const [year, month, day] = invoice.dueDate.split("-").map(Number);
      const due = new Date(Date.UTC(year!, month! - 1, day!));
      if (due.getTime() <= dueSoonEnd.getTime()) {
        priority = "due_soon";
      }
    }
    return { ...invoice, priority };
  });

  const weight: Record<ReceivablePriority, number> = {
    overdue: 0,
    due_soon: 1,
    outstanding: 2,
  };

  return ranked.sort((a, b) => {
    const byPriority = weight[a.priority] - weight[b.priority];
    if (byPriority !== 0) {
      return byPriority;
    }
    return a.dueDate.localeCompare(b.dueDate);
  });
}

export function receivablePriorityLabel(priority: ReceivablePriority): string {
  switch (priority) {
    case "overdue":
      return "Overdue";
    case "due_soon":
      return "Due soon";
    default:
      return "Outstanding";
  }
}
