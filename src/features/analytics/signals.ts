import { moneyToCents } from "@/features/invoices/money";
import type { DashboardCurrencyMetrics } from "@/features/dashboard/money";
import type { AnalyticsProjectStatusCount, AnalyticsSignal } from "@/server/analytics/types";

export type BuildAnalyticsSignalsInput = {
  primary?: DashboardCurrencyMetrics;
  overdueCount: number;
  outstandingCount: number;
  invoiceCountInPeriod: number;
  paymentCountInPeriod: number;
  projectStatusCounts: AnalyticsProjectStatusCount[];
};

/**
 * Deterministic, explainable business signals.
 * No AI — each rule has an explicit threshold.
 */
export function buildAnalyticsSignals(
  input: BuildAnalyticsSignalsInput,
): AnalyticsSignal[] {
  const signals: AnalyticsSignal[] = [];

  if (input.overdueCount > 0) {
    signals.push({
      id: "overdue-invoices",
      severity: "attention",
      title:
        input.overdueCount === 1
          ? "1 overdue invoice needs attention"
          : `${input.overdueCount} overdue invoices need attention`,
      detail:
        "Overdue balances are invoices past due with remaining amount. Review receivables in Finance.",
      href: "/finance",
    });
  }

  const primary = input.primary;
  if (
    primary &&
    moneyToCents(primary.totalInvoiced) > 0 &&
    moneyToCents(primary.totalPaid) * 2 < moneyToCents(primary.totalInvoiced)
  ) {
    signals.push({
      id: "payments-trailing",
      severity: "attention",
      title: `Payments trailing invoicing (${primary.currency})`,
      detail: `Paid is less than half of invoiced in ${primary.currency} for this period. No FX conversion is applied.`,
      href: "/payments",
    });
  }

  if (
    input.invoiceCountInPeriod > 0 &&
    input.paymentCountInPeriod === 0
  ) {
    signals.push({
      id: "no-payments-in-period",
      severity: "info",
      title: "Invoices issued with no payments recorded",
      detail:
        "Non-draft invoices exist in this period, but no payments were recorded in the same window.",
      href: "/payments/new",
    });
  } else if (input.outstandingCount > 0 && input.overdueCount === 0) {
    signals.push({
      id: "outstanding-open",
      severity: "info",
      title:
        input.outstandingCount === 1
          ? "1 invoice still outstanding"
          : `${input.outstandingCount} invoices still outstanding`,
      detail:
        "Open balances are not yet overdue. Track collection before due dates slip.",
      href: "/finance",
    });
  }

  const active =
    input.projectStatusCounts.find((row) => row.status === "active")?.count ??
    0;
  const totalProjects = input.projectStatusCounts.reduce(
    (sum, row) => sum + row.count,
    0,
  );
  if (totalProjects >= 3 && active * 10 >= totalProjects * 7) {
    signals.push({
      id: "active-project-concentration",
      severity: "info",
      title: "Project workload concentrated in active status",
      detail: `${active} of ${totalProjects} projects are active (≥70%).`,
      href: "/projects",
    });
  }

  return signals.slice(0, 4);
}
