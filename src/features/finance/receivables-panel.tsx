import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  prioritizeReceivables,
  receivablePriorityLabel,
  type PrioritizedReceivable,
} from "@/features/finance/receivables";
import { InvoiceStatusBadge } from "@/features/invoices/invoice-status-badge";
import type { DashboardOutstandingInvoice } from "@/server/dashboard/types";
import { cn } from "@/lib/utils/cn";

type FinanceReceivablesPanelProps = {
  invoices: DashboardOutstandingInvoice[];
  overdueCount: number;
  todayStart: Date;
};

function formatDate(value: string) {
  try {
    const [year, month, day] = value.split("-").map(Number);
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(year!, month! - 1, day!)));
  } catch {
    return value;
  }
}

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function PriorityBadge({ invoice }: { invoice: PrioritizedReceivable }) {
  if (invoice.priority === "overdue") {
    return <Badge variant="warning">{receivablePriorityLabel("overdue")}</Badge>;
  }
  if (invoice.priority === "due_soon") {
    return <Badge variant="secondary">{receivablePriorityLabel("due_soon")}</Badge>;
  }
  return (
    <Badge variant="outline">{receivablePriorityLabel("outstanding")}</Badge>
  );
}

export function FinanceReceivablesPanel({
  invoices,
  overdueCount,
  todayStart,
}: FinanceReceivablesPanelProps) {
  const ranked = prioritizeReceivables(invoices, todayStart);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 p-5 sm:p-6">
        <div className="min-w-0 space-y-1">
          <CardTitle id="finance-receivables-heading">
            Receivables
          </CardTitle>
          <CardDescription>
            {overdueCount > 0
              ? `${overdueCount} overdue · prioritized for attention`
              : "Outstanding balances for invoices issued in this period"}
          </CardDescription>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/invoices">View invoices</Link>
        </Button>
      </CardHeader>
      <CardContent className="p-0 sm:px-1">
        {ranked.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-muted-foreground sm:px-6">
            No outstanding receivables in this period.
          </p>
        ) : (
          <>
            <div className="hidden md:block">
              <table className="w-full min-w-0 border-collapse text-left text-sm">
                <caption className="sr-only">
                  Receivables prioritized by overdue, due soon, then outstanding
                </caption>
                <thead>
                  <tr className="border-y border-border">
                    <th
                      scope="col"
                      className="px-5 py-2.5 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase"
                    >
                      Invoice
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-2.5 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase"
                    >
                      Priority
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-2.5 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase"
                    >
                      Due
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-2.5 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase"
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-5 py-2.5 text-right text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase"
                    >
                      Remaining
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="border-b border-border last:border-0"
                    >
                      <th scope="row" className="px-5 py-3 font-normal">
                        <Link
                          href={`/invoices/${invoice.id}`}
                          className="block min-w-0 rounded-[var(--radius-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <span className="block font-mono text-sm font-medium tracking-wide text-foreground hover:text-primary">
                            {invoice.invoiceNumber}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                            {invoice.customerNameSnapshot}
                          </span>
                        </Link>
                      </th>
                      <td className="px-3 py-3">
                        <PriorityBadge invoice={invoice} />
                      </td>
                      <td
                        className={cn(
                          "px-3 py-3 tabular-nums text-muted-foreground",
                          invoice.isOverdue && "font-medium text-warning",
                        )}
                      >
                        {formatDate(invoice.dueDate)}
                      </td>
                      <td className="px-3 py-3">
                        <InvoiceStatusBadge status={invoice.status} />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="block font-semibold tabular-nums text-foreground">
                          {formatMoney(invoice.remaining, invoice.currency)}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-muted-foreground">
                          of {formatMoney(invoice.total, invoice.currency)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul
              className="divide-y divide-border md:hidden"
              aria-label="Receivables"
            >
              {ranked.map((invoice) => (
                <li key={invoice.id}>
                  <Link
                    href={`/invoices/${invoice.id}`}
                    className="block space-y-1.5 px-5 py-3.5 transition-ui hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-medium tracking-wide text-foreground">
                        {invoice.invoiceNumber}
                      </span>
                      <PriorityBadge invoice={invoice} />
                      <InvoiceStatusBadge status={invoice.status} />
                    </span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {invoice.customerNameSnapshot}
                    </span>
                    <span className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                      <span
                        className={cn(
                          "text-xs text-muted-foreground",
                          invoice.isOverdue && "font-medium text-warning",
                        )}
                      >
                        Due {formatDate(invoice.dueDate)}
                      </span>
                      <span className="font-semibold tabular-nums text-foreground">
                        {formatMoney(invoice.remaining, invoice.currency)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
