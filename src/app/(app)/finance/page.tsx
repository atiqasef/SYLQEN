import Link from "next/link";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { FinanceIcon } from "@/components/layout/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DashboardKpiCards } from "@/features/dashboard/kpi-cards";
import { PaymentTrendChart } from "@/features/dashboard/payment-trend-chart";
import { DashboardRangeSelector } from "@/features/dashboard/range-selector";
import { RecentPaymentsPanel } from "@/features/dashboard/recent-payments";
import {
  DASHBOARD_RANGE_LABELS,
  utcTodayStart,
} from "@/features/dashboard/schemas";
import { FinanceActivityPanel } from "@/features/finance/activity-panel";
import { FinanceReceivablesPanel } from "@/features/finance/receivables-panel";
import { FinanceRevenueSummary } from "@/features/finance/revenue-summary";
import { isAppError, toAppError } from "@/lib/errors/app-error";
import { requireVerifiedPageSession } from "@/server/auth/session";
import { getFinanceSnapshotForSession } from "@/server/finance/service";

type FinancePageProps = {
  searchParams: Promise<{
    range?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function FinancePage({ searchParams }: FinancePageProps) {
  const session = await requireVerifiedPageSession();
  const params = await searchParams;
  const rangeParam = firstParam(params.range);

  let snapshot;
  try {
    snapshot = await getFinanceSnapshotForSession(session, {
      range: rangeParam,
    });
  } catch (error) {
    const appError = toAppError(error);
    return (
      <div className="space-y-6 sm:space-y-8">
        <FinancePageHeader
          workspaceName={session.workspace.name}
          isDemo={session.user.isDemo}
        />
        <ErrorState
          title="Unable to load finance"
          description={
            isAppError(error)
              ? appError.userMessage
              : "Something went wrong while loading financial data. Please try again."
          }
        />
      </div>
    );
  }

  const primaryMetrics = snapshot.primaryCurrency
    ? snapshot.metricsByCurrency.find(
        (row) => row.currency === snapshot.primaryCurrency,
      )
    : undefined;

  const hasActivity =
    snapshot.counts.invoiceCountInPeriod > 0 ||
    snapshot.counts.paymentCountInPeriod > 0 ||
    snapshot.recentInvoices.length > 0 ||
    snapshot.recentPayments.length > 0;

  const todayStart = utcTodayStart();

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="space-y-3" aria-labelledby="finance-heading">
        <FinancePageHeader
          workspaceName={session.workspace.name}
          isDemo={session.user.isDemo}
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground sm:text-sm">
            {DASHBOARD_RANGE_LABELS[snapshot.period.rangeDays]} ·{" "}
            <span className="tabular-nums">
              {snapshot.period.startDateOnly} → {snapshot.period.endDateOnly}
            </span>{" "}
            UTC
          </p>
          <DashboardRangeSelector
            rangeDays={snapshot.period.rangeDays}
            basePath="/finance"
            ariaLabel="Finance date range"
          />
        </div>
      </section>

      <DashboardKpiCards
        metrics={primaryMetrics}
        currency={snapshot.primaryCurrency}
        multiCurrencyCount={snapshot.metricsByCurrency.length}
      />

      {snapshot.metricsByCurrency.length > 1 ? (
        <section
          className="rounded-[var(--radius-lg)] border border-border bg-card px-4 py-3 shadow-panel sm:px-5"
          aria-label="Currency breakdown"
        >
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            By currency
          </p>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {snapshot.metricsByCurrency.map((row) => (
              <li key={row.currency} className="tabular-nums text-foreground">
                <span className="font-mono text-xs tracking-wide uppercase text-muted-foreground">
                  {row.currency}
                </span>{" "}
                invoiced {row.totalInvoiced.toFixed(2)} · paid{" "}
                {row.totalPaid.toFixed(2)} · due {row.outstanding.toFixed(2)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!hasActivity ? (
        <EmptyState
          icon={<FinanceIcon className="size-8" />}
          title="No financial activity yet"
          description="Create invoices and record payments to populate Finance. Currency totals are never mixed."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link href="/invoices/new">Add invoice</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/payments/new">Record payment</Link>
              </Button>
            </div>
          }
        />
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <FinanceRevenueSummary
          metrics={primaryMetrics}
          currency={snapshot.primaryCurrency}
          counts={snapshot.counts}
        />
        <div className="space-y-4">
          <PaymentTrendChart
            points={snapshot.paymentTrend}
            currency={snapshot.primaryCurrency ?? "USD"}
            periodLabel={DASHBOARD_RANGE_LABELS[snapshot.period.rangeDays]}
          />
          <RecentPaymentsPanel payments={snapshot.recentPayments} />
        </div>
      </div>

      <FinanceReceivablesPanel
        invoices={snapshot.outstandingInvoices}
        overdueCount={snapshot.counts.overdueCount}
        todayStart={todayStart}
      />

      <FinanceActivityPanel
        payments={snapshot.recentPayments}
        invoices={snapshot.recentInvoices}
      />
    </div>
  );
}

function FinancePageHeader({
  workspaceName,
  isDemo,
}: {
  workspaceName: string;
  isDemo: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2
          id="finance-heading"
          className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem] sm:leading-tight"
        >
          Finance
        </h2>
        {isDemo ? <Badge variant="warning">Demo read-only</Badge> : null}
      </div>
      <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[0.9375rem] sm:leading-7">
        Financial command center for{" "}
        <span className="font-medium text-foreground">{workspaceName}</span>.
        Review invoicing, payments, and receivables without leaving the
        workspace.
      </p>
      {isDemo ? (
        <p
          role="status"
          className="rounded-[var(--radius-md)] border border-border bg-muted/60 px-3 py-2 text-sm leading-6 text-muted-foreground"
        >
          Demo accounts can view Finance, but cannot create or change invoices
          or payments.
        </p>
      ) : null}
    </div>
  );
}
