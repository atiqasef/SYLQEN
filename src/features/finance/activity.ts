import type {
  DashboardRecentInvoice,
  DashboardRecentPayment,
} from "@/server/dashboard/types";

export type FinanceActivityKind =
  | "payment_received"
  | "invoice_issued"
  | "invoice_paid";

export type FinanceActivityItem = {
  id: string;
  kind: FinanceActivityKind;
  date: string;
  title: string;
  subtitle: string;
  href: string;
  amount?: number;
  currency?: string;
};

function activityLabel(kind: FinanceActivityKind): string {
  switch (kind) {
    case "payment_received":
      return "Payment received";
    case "invoice_paid":
      return "Invoice marked paid";
    default:
      return "Invoice issued";
  }
}

/**
 * Merge bounded recent payments/invoices into a single activity timeline.
 * Pure composition — no extra database access.
 */
export function buildFinanceActivity(options: {
  payments: DashboardRecentPayment[];
  invoices: DashboardRecentInvoice[];
  limit?: number;
}): FinanceActivityItem[] {
  const limit = options.limit ?? 8;
  const items: FinanceActivityItem[] = [];

  for (const payment of options.payments) {
    items.push({
      id: `payment:${payment.id}`,
      kind: "payment_received",
      date: payment.paymentDate,
      title: activityLabel("payment_received"),
      subtitle: `${payment.invoiceNumberSnapshot} · ${payment.customerNameSnapshot}`,
      href: `/payments/${payment.id}`,
      amount: payment.amount,
      currency: payment.currency,
    });
  }

  for (const invoice of options.invoices) {
    const kind: FinanceActivityKind =
      invoice.status === "paid" ? "invoice_paid" : "invoice_issued";
    items.push({
      id: `invoice:${invoice.id}`,
      kind,
      date: invoice.issueDate,
      title: activityLabel(kind),
      subtitle: `${invoice.invoiceNumber} · ${invoice.customerNameSnapshot}`,
      href: `/invoices/${invoice.id}`,
      amount: invoice.total,
      currency: invoice.currency,
    });
  }

  return items
    .sort((a, b) => {
      const byDate = b.date.localeCompare(a.date);
      if (byDate !== 0) {
        return byDate;
      }
      return a.id.localeCompare(b.id);
    })
    .slice(0, limit);
}
