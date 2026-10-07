import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { DashboardCurrencyMetrics } from "@/features/dashboard/money";
import type { DashboardFinancialSnapshot } from "@/server/dashboard/types";
import { cn } from "@/lib/utils/cn";

type RevenueSummaryProps = {
  metrics: DashboardCurrencyMetrics | undefined;
  currency?: string;
  counts: DashboardFinancialSnapshot["counts"];
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

export function FinanceRevenueSummary({
  metrics,
  currency,
  counts,
}: RevenueSummaryProps) {
  const code = currency ?? metrics?.currency ?? "USD";

  const amountRows = [
    {
      label: "Invoiced",
      value: formatMoney(metrics?.totalInvoiced ?? 0, code),
    },
    {
      label: "Paid",
      value: formatMoney(metrics?.totalPaid ?? 0, code),
    },
    {
      label: "Outstanding",
      value: formatMoney(metrics?.outstanding ?? 0, code),
    },
    {
      label: "Overdue",
      value: formatMoney(metrics?.overdue ?? 0, code),
      emphasize: true,
    },
  ] as const;

  const countRows = [
    { label: "Invoices", value: counts.invoiceCountInPeriod },
    { label: "Paid invoices", value: counts.paidInvoiceCount },
    { label: "Outstanding", value: counts.outstandingCount },
    { label: "Overdue", value: counts.overdueCount },
    { label: "Payments", value: counts.paymentCountInPeriod },
  ] as const;

  return (
    <section
      className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-panel"
      aria-labelledby="finance-revenue-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-5">
        <div className="min-w-0 space-y-1">
          <h3
            id="finance-revenue-heading"
            className="text-sm font-semibold tracking-tight text-foreground"
          >
            Revenue & invoicing
          </h3>
          <p className="text-xs leading-5 text-muted-foreground sm:text-sm">
            Period totals in{" "}
            <span className="font-mono font-medium tracking-wide uppercase text-foreground">
              {code}
            </span>
            . Manage records in Invoices.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/invoices">Open invoices</Link>
        </Button>
      </div>

      <div className="grid gap-4 px-4 py-4 sm:grid-cols-2 sm:px-5 sm:py-5">
        <dl className="space-y-3">
          {amountRows.map((row) => (
            <div
              key={row.label}
              className="flex items-baseline justify-between gap-3 border-b border-border/70 pb-2 last:border-0 last:pb-0"
            >
              <dt className="text-sm text-muted-foreground">{row.label}</dt>
              <dd
                className={cn(
                  "font-semibold tabular-nums text-foreground",
                  "emphasize" in row && row.emphasize && "text-warning",
                )}
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>

        <dl className="space-y-3">
          {countRows.map((row) => (
            <div
              key={row.label}
              className="flex items-baseline justify-between gap-3 border-b border-border/70 pb-2 last:border-0 last:pb-0"
            >
              <dt className="text-sm text-muted-foreground">{row.label}</dt>
              <dd className="font-semibold tabular-nums text-foreground">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
