import Link from "next/link";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { FinanceIcon } from "@/components/layout/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DashboardKpiCards } from "@/features/dashboard/kpi-cards";
import { OutstandingInvoicesPanel } from "@/features/dashboard/outstanding-invoices";
import { PaymentTrendChart } from "@/features/dashboard/payment-trend-chart";
import { DashboardRangeSelector } from "@/features/dashboard/range-selector";
import { RecentInvoicesPanel } from "@/features/dashboard/recent-invoices";
import { RecentPaymentsPanel } from "@/features/dashboard/recent-payments";
import { DASHBOARD_RANGE_LABELS } from "@/features/dashboard/schemas";
import { isAppError, toAppError } from "@/lib/errors/app-error";
import { requireVerifiedPageSession } from "@/server/auth/session";
import { getDashboardFinancialSnapshotForSession } from "@/server/dashboard/service";

type OverviewPageProps = {
  searchParams: Promise<{
    range?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatRole(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export default async function OverviewPage({ searchParams }: OverviewPageProps) {
  const session = await requireVerifiedPageSession();
  const params = await searchParams;
  const rangeParam = firstParam(params.range);
  const roleLabel = formatRole(session.membership.role);

  let snapshot;
  try {
    snapshot = await getDashboardFinancialSnapshotForSession(session, {
      range: rangeParam,
    });
  } catch (error) {
    const appError = toAppError(error);
    return (
      <div className="space-y-6 sm:space-y-8">
        <OverviewHeader
          name={session.user.name}
          workspaceName={session.workspace.name}
          role={session.membership.role}
          isDemo={session.user.isDemo}
        />
        <ErrorState
          title="Unable to load financial overview"
          description={
            isAppError(error)
              ? appError.userMessage
              : "Something went wrong while loading dashboard metrics."
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

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="space-y-3" aria-labelledby="overview-heading">
        <OverviewHeader
          name={session.user.name}
          workspaceName={session.workspace.name}
          role={session.membership.role}
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
          <DashboardRangeSelector rangeDays={snapshot.period.rangeDays} />
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
          description="Create invoices and record payments to populate this overview."
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

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <PaymentTrendChart
          points={snapshot.paymentTrend}
          currency={snapshot.primaryCurrency ?? "USD"}
          periodLabel={DASHBOARD_RANGE_LABELS[snapshot.period.rangeDays]}
        />
        <RecentPaymentsPanel payments={snapshot.recentPayments} />
      </div>

      <OutstandingInvoicesPanel
        invoices={snapshot.outstandingInvoices}
        overdueCount={snapshot.counts.overdueCount}
      />

      <RecentInvoicesPanel invoices={snapshot.recentInvoices} />

      <Card>
        <CardHeader className="p-5 sm:p-6">
          <CardTitle>Session</CardTitle>
          <CardDescription>
            Trusted identity for {session.workspace.name}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
          <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-xs text-muted-foreground">Role</dt>
              <dd className="mt-0.5 font-medium text-foreground">{roleLabel}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Account</dt>
              <dd className="mt-0.5 font-medium text-foreground">
                {session.user.isDemo ? "Demo" : "Standard"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Email</dt>
              <dd className="mt-0.5 truncate font-medium text-foreground">
                {session.user.email}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Permissions</dt>
              <dd className="mt-0.5 font-medium tabular-nums text-foreground">
                {session.membership.permissions.length}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

function OverviewHeader({
  name,
  workspaceName,
  role,
  isDemo,
}: {
  name: string;
  workspaceName: string;
  role: string;
  isDemo: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2
          id="overview-heading"
          className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem] sm:leading-tight"
        >
          Welcome, {name}
        </h2>
        {isDemo ? <Badge variant="warning">Demo read-only</Badge> : null}
      </div>
      <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[0.9375rem] sm:leading-7">
        Financial overview for{" "}
        <span className="font-medium text-foreground">{workspaceName}</span> ·
        signed in as{" "}
        <span className="font-medium text-foreground">{role}</span>.
      </p>
      {isDemo ? (
        <p
          role="status"
          className="rounded-[var(--radius-md)] border border-border bg-muted/60 px-3 py-2 text-sm leading-6 text-muted-foreground"
        >
          Demo accounts can view financial overview data, but cannot create or
          change records.
        </p>
      ) : null}
    </div>
  );
}
