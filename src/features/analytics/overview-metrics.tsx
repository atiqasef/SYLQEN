import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DashboardCurrencyMetrics } from "@/features/dashboard/money";
import type { AnalyticsSnapshot } from "@/server/analytics/types";

type OverviewMetricsProps = {
  metrics?: DashboardCurrencyMetrics;
  currency?: string;
  multiCurrencyCount: number;
  counts: AnalyticsSnapshot["counts"];
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

function MetricTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-background/60 px-3 py-3 sm:px-4">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1.5 font-mono text-lg font-semibold tabular-nums tracking-tight text-foreground sm:text-xl">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/** Compact executive overview — trend/context focused, not a Finance KPI clone. */
export function AnalyticsOverviewMetrics({
  metrics,
  currency,
  multiCurrencyCount,
  counts,
}: OverviewMetricsProps) {
  const code = currency ?? "—";

  return (
    <Card>
      <CardHeader className="p-5 sm:p-6">
        <CardTitle id="analytics-overview-heading">Executive overview</CardTitle>
        <CardDescription>
          Period activity for {code}
          {multiCurrencyCount > 1
            ? ` · ${multiCurrencyCount} currencies (not mixed)`
            : null}
          .{" "}
          <Link
            href="/finance"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Open Finance
          </Link>{" "}
          for receivables detail.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 p-5 pt-0 sm:grid-cols-2 sm:p-6 sm:pt-0 xl:grid-cols-4">
        <MetricTile
          label="Paid (period)"
          value={
            metrics && currency
              ? formatMoney(metrics.totalPaid, currency)
              : "—"
          }
          hint="Payments by payment date"
        />
        <MetricTile
          label="Invoiced (period)"
          value={
            metrics && currency
              ? formatMoney(metrics.totalInvoiced, currency)
              : "—"
          }
          hint="Non-draft by issue date"
        />
        <MetricTile
          label="Outstanding"
          value={
            metrics && currency
              ? formatMoney(metrics.outstanding, currency)
              : "—"
          }
          hint={`${counts.outstandingCount} open · ${counts.overdueCount} overdue`}
        />
        <MetricTile
          label="Overdue"
          value={
            metrics && currency ? formatMoney(metrics.overdue, currency) : "—"
          }
          hint="Remaining past due"
        />
        <MetricTile
          label="Invoices"
          value={String(counts.invoiceCountInPeriod)}
          hint={`${counts.paidInvoiceCount} fully paid`}
        />
        <MetricTile
          label="Payments"
          value={String(counts.paymentCountInPeriod)}
        />
        <MetricTile label="New customers" value={String(counts.newCustomers)} />
        <MetricTile
          label="New products / projects"
          value={`${counts.newProducts} / ${counts.newProjects}`}
        />
      </CardContent>
    </Card>
  );
}
