import "server-only";

import { AppError } from "@/lib/errors/app-error";
import { parseWithSchema } from "@/lib/validation/result";
import { pickPrimaryCurrency } from "@/features/dashboard/money";
import {
  dashboardPeriodBounds,
  dashboardRangeQuerySchema,
  utcTodayStart,
  type DashboardRangeDays,
} from "@/features/dashboard/schemas";
import type { SessionContext } from "@/server/auth/types";
import {
  aggregateInvoiceTotalsByCurrency,
  aggregateOutstandingAndOverdue,
  aggregatePaymentTotalsByCurrency,
  aggregatePaymentTrend,
  buildCurrencyMetrics,
  listRecentInvoicesForDashboard,
  listRecentPaymentsForDashboard,
} from "@/server/dashboard/queries";
import type { DashboardFinancialSnapshot } from "@/server/dashboard/types";
import { ensureInvoiceIndexes } from "@/server/invoices/repository";
import { ensurePaymentIndexes } from "@/server/payments/repository";

function assertDashboardRead(session: SessionContext) {
  const canReadInvoices = session.membership.permissions.includes("invoices.read");
  const canReadPayments = session.membership.permissions.includes("payments.read");

  if (!canReadInvoices || !canReadPayments) {
    throw new AppError({
      code: "FORBIDDEN",
      message: "Missing dashboard read permissions",
      userMessage: "You do not have permission to view financial overview data.",
    });
  }
}

export async function getDashboardFinancialSnapshotForSession(
  session: SessionContext,
  rawQuery: unknown,
  now: Date = new Date(),
  options?: { outstandingLimit?: number },
): Promise<DashboardFinancialSnapshot> {
  assertDashboardRead(session);
  await Promise.all([ensureInvoiceIndexes(), ensurePaymentIndexes()]);

  const parsed = parseWithSchema(dashboardRangeQuerySchema, rawQuery ?? {});
  if (!parsed.ok) {
    throw parsed.error;
  }

  const rangeDays = parsed.data.range as DashboardRangeDays;
  const period = dashboardPeriodBounds(rangeDays, now);
  const todayStart = utcTodayStart(now);
  const workspaceId = session.workspace.id;
  const outstandingLimit = options?.outstandingLimit ?? 8;

  const [invoiced, paid, outstandingBundle, recentPayments, recentInvoices] =
    await Promise.all([
      aggregateInvoiceTotalsByCurrency({
        workspaceId,
        start: period.start,
        endExclusive: period.endExclusive,
      }),
      aggregatePaymentTotalsByCurrency({
        workspaceId,
        start: period.start,
        endExclusive: period.endExclusive,
      }),
      aggregateOutstandingAndOverdue({
        workspaceId,
        start: period.start,
        endExclusive: period.endExclusive,
        todayStart,
        limit: outstandingLimit,
      }),
      listRecentPaymentsForDashboard({ workspaceId, limit: 5 }),
      listRecentInvoicesForDashboard({ workspaceId, limit: 5 }),
    ]);

  const metricsByCurrency = buildCurrencyMetrics({
    invoiced,
    paid,
    outstanding: outstandingBundle.metrics,
  });

  const primaryCurrency = pickPrimaryCurrency(metricsByCurrency);

  const paymentTrend = primaryCurrency
    ? await aggregatePaymentTrend({
        workspaceId,
        currency: primaryCurrency,
        start: period.start,
        endExclusive: period.endExclusive,
      })
    : [];

  const invoiceCountInPeriod = invoiced.reduce((sum, row) => sum + row.count, 0);
  const paymentCountInPeriod = paid.reduce((sum, row) => sum + row.count, 0);

  return {
    period: {
      rangeDays,
      startDateOnly: period.startDateOnly,
      endDateOnly: period.endDateOnly,
    },
    metricsByCurrency,
    primaryCurrency,
    paymentTrend,
    outstandingInvoices: outstandingBundle.outstandingInvoices,
    recentPayments,
    recentInvoices,
    counts: {
      invoiceCountInPeriod,
      paymentCountInPeriod,
      paidInvoiceCount: outstandingBundle.paidInvoiceCount,
      outstandingCount: outstandingBundle.outstandingCount,
      overdueCount: outstandingBundle.overdueCount,
    },
  };
}
