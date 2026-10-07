import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  AnalyticsCustomerOutstanding,
  AnalyticsCustomerRank,
} from "@/server/analytics/types";

type CustomerInsightsProps = {
  currency?: string;
  topByInvoiced: AnalyticsCustomerRank[];
  withOutstanding: AnalyticsCustomerOutstanding[];
};

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

export function AnalyticsCustomerInsights({
  currency,
  topByInvoiced,
  withOutstanding,
}: CustomerInsightsProps) {
  const code = currency ?? "—";

  return (
    <Card>
      <CardHeader className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle id="analytics-customers-heading">
              Customer insights
            </CardTitle>
            <CardDescription>
              Ranked from invoice snapshots in {code}. Names reflect invoice-time
              snapshots.
            </CardDescription>
          </div>
          <Link
            href="/customers"
            className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
          >
            All customers
          </Link>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 p-5 pt-0 sm:p-6 sm:pt-0 lg:grid-cols-2">
        <section aria-labelledby="analytics-top-customers">
          <h3
            id="analytics-top-customers"
            className="text-sm font-semibold text-foreground"
          >
            Top by invoiced value
          </h3>
          {topByInvoiced.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No non-draft invoices in this period for {code}.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border rounded-[var(--radius-md)] border border-border">
              {topByInvoiced.map((row) => (
                <li
                  key={`${row.customerId}-${row.currency}`}
                  className="flex flex-col gap-1 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/customers/${row.customerId}`}
                      className="truncate text-sm font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      {row.customerName}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {row.invoiceCount} invoice
                      {row.invoiceCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <p className="font-mono text-sm tabular-nums text-foreground">
                    {formatMoney(row.invoiced, row.currency)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="analytics-outstanding-customers">
          <h3
            id="analytics-outstanding-customers"
            className="text-sm font-semibold text-foreground"
          >
            Outstanding / overdue
          </h3>
          {withOutstanding.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No open balances for {code} in this period.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border rounded-[var(--radius-md)] border border-border">
              {withOutstanding.map((row) => (
                <li
                  key={`${row.customerId}-os`}
                  className="flex flex-col gap-1 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/customers/${row.customerId}`}
                      className="truncate text-sm font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      {row.customerName}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {row.invoiceCount} open · overdue{" "}
                      {formatMoney(row.overdue, row.currency)}
                    </p>
                  </div>
                  <p className="font-mono text-sm tabular-nums text-foreground">
                    {formatMoney(row.outstanding, row.currency)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
