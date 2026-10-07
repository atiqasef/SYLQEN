import Link from "next/link";

import { InvoiceStatusBadge } from "@/features/invoices/invoice-status-badge";
import type { DashboardRecentInvoice } from "@/server/dashboard/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type RecentInvoicesProps = {
  invoices: DashboardRecentInvoice[];
};

function formatDate(value: string) {
  try {
    const [year, month, day] = value.split("-").map(Number);
    return new Intl.DateTimeFormat(undefined, {
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

export function RecentInvoicesPanel({ invoices }: RecentInvoicesProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 p-5 sm:p-6">
        <div className="min-w-0 space-y-1">
          <CardTitle>Recent invoices</CardTitle>
          <CardDescription>Newest invoices in this workspace</CardDescription>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/invoices">View all</Link>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {invoices.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-muted-foreground sm:px-6">
            No invoices yet. Create an invoice to start tracking revenue.
          </p>
        ) : (
          <>
            <div className="hidden sm:block">
              <table className="w-full min-w-0 border-collapse text-left text-sm">
                <caption className="sr-only">Recent invoices</caption>
                <thead>
                  <tr className="border-y border-border">
                    <th
                      scope="col"
                      className="px-5 py-2.5 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase sm:px-6"
                    >
                      Invoice
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-2.5 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase"
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-2.5 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase"
                    >
                      Issued
                    </th>
                    <th
                      scope="col"
                      className="px-5 py-2.5 text-right text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase sm:px-6"
                    >
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="border-b border-border last:border-0"
                    >
                      <th scope="row" className="px-5 py-3 font-normal sm:px-6">
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
                        <InvoiceStatusBadge status={invoice.status} />
                      </td>
                      <td className="px-3 py-3 tabular-nums text-muted-foreground">
                        {formatDate(invoice.issueDate)}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold tabular-nums text-foreground sm:px-6">
                        {formatMoney(invoice.total, invoice.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-border sm:hidden" aria-label="Recent invoices">
              {invoices.map((invoice) => (
                <li key={invoice.id}>
                  <Link
                    href={`/invoices/${invoice.id}`}
                    className="block space-y-1.5 px-5 py-3.5 transition-ui hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-medium tracking-wide text-foreground">
                        {invoice.invoiceNumber}
                      </span>
                      <InvoiceStatusBadge status={invoice.status} />
                    </span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {invoice.customerNameSnapshot}
                    </span>
                    <span className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                      <span className="text-xs text-muted-foreground">
                        Issued {formatDate(invoice.issueDate)}
                      </span>
                      <span className="font-semibold tabular-nums text-foreground">
                        {formatMoney(invoice.total, invoice.currency)}
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
