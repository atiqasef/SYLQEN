import Link from "next/link";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { ChartIcon } from "@/components/layout/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DashboardRangeSelector } from "@/features/dashboard/range-selector";
import { DASHBOARD_RANGE_LABELS } from "@/features/dashboard/schemas";
import { AnalyticsCustomerInsights } from "@/features/analytics/customer-insights";
import { AnalyticsFinancialTrendChart } from "@/features/analytics/financial-trend-chart";
import { AnalyticsOverviewMetrics } from "@/features/analytics/overview-metrics";
import { AnalyticsProductInsights } from "@/features/analytics/product-insights";
import { AnalyticsProjectInsights } from "@/features/analytics/project-insights";
import { AnalyticsSignalsPanel } from "@/features/analytics/signals-panel";
import { isAppError, toAppError } from "@/lib/errors/app-error";
import { requireVerifiedPageSession } from "@/server/auth/session";
import { getAnalyticsSnapshotForSession } from "@/server/analytics/service";

type AnalyticsPageProps = {
  searchParams: Promise<{
    range?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AnalyticsPage({
  searchParams,
}: AnalyticsPageProps) {
  const session = await requireVerifiedPageSession();
  const params = await searchParams;
  const rangeParam = firstParam(params.range);

  let snapshot;
  try {
    snapshot = await getAnalyticsSnapshotForSession(session, {
      range: rangeParam,
    });
  } catch (error) {
    const appError = toAppError(error);
    return (
      <div className="space-y-6 sm:space-y-8">
        <AnalyticsPageHeader
          workspaceName={session.workspace.name}
          isDemo={session.user.isDemo}
        />
        <ErrorState
          title="Unable to load analytics"
          description={
            isAppError(error)
              ? appError.userMessage
              : "Something went wrong while loading analytics. Please try again."
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
    snapshot.counts.newCustomers > 0 ||
    snapshot.counts.newProducts > 0 ||
    snapshot.counts.newProjects > 0 ||
    snapshot.projectStatusCounts.some((row) => row.count > 0);

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="space-y-3" aria-labelledby="analytics-heading">
        <AnalyticsPageHeader
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
            basePath="/analytics"
            ariaLabel="Analytics date range"
          />
        </div>
      </section>

      {!hasActivity ? (
        <EmptyState
          icon={<ChartIcon className="size-8" />}
          title="No analytics data yet"
          description="Create customers, products, projects, invoices, and payments to populate trends and rankings. Monetary totals stay currency-separated."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link href="/invoices/new">Add invoice</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/customers/new">Add customer</Link>
              </Button>
            </div>
          }
        />
      ) : null}

      <AnalyticsOverviewMetrics
        metrics={primaryMetrics}
        currency={snapshot.primaryCurrency}
        multiCurrencyCount={snapshot.metricsByCurrency.length}
        counts={snapshot.counts}
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
                {row.totalPaid.toFixed(2)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <AnalyticsFinancialTrendChart
          points={snapshot.financialTrend.points}
          currency={snapshot.financialTrend.currency}
          bucket={snapshot.financialTrend.bucket}
          periodLabel={DASHBOARD_RANGE_LABELS[snapshot.period.rangeDays]}
        />
        <AnalyticsSignalsPanel signals={snapshot.signals} />
      </div>

      <AnalyticsCustomerInsights
        currency={snapshot.primaryCurrency}
        topByInvoiced={snapshot.topCustomersByInvoiced}
        withOutstanding={snapshot.customersWithOutstanding}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <AnalyticsProductInsights
          currency={snapshot.primaryCurrency}
          topByInvoiced={snapshot.topProductsByInvoiced}
        />
        <AnalyticsProjectInsights
          statusCounts={snapshot.projectStatusCounts}
          dueAttention={snapshot.projectsDueAttention}
        />
      </div>
    </div>
  );
}

function AnalyticsPageHeader({
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
          id="analytics-heading"
          className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem] sm:leading-tight"
        >
          Analytics
        </h2>
        {isDemo ? <Badge variant="warning">Demo read-only</Badge> : null}
      </div>
      <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[0.9375rem] sm:leading-7">
        Decision-support trends for{" "}
        <span className="font-medium text-foreground">{workspaceName}</span>.
        Complements Finance with performance over time, rankings, and explainable
        signals.
      </p>
      {isDemo ? (
        <p
          role="status"
          className="rounded-[var(--radius-md)] border border-border bg-muted/60 px-3 py-2 text-sm leading-6 text-muted-foreground"
        >
          Demo accounts can view Analytics, but cannot create or change business
          records.
        </p>
      ) : null}
    </div>
  );
}
