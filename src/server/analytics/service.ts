import "server-only";

import { analyticsBucketForRange } from "@/features/analytics/buckets";
import { buildAnalyticsSignals } from "@/features/analytics/signals";
import { pickPrimaryCurrency } from "@/features/dashboard/money";
import {
  dashboardPeriodBounds,
  dashboardRangeQuerySchema,
  utcTodayStart,
  type DashboardRangeDays,
} from "@/features/dashboard/schemas";
import { AppError } from "@/lib/errors/app-error";
import { parseWithSchema } from "@/lib/validation/result";
import {
  aggregateCustomersWithOutstanding,
  aggregateInvoicedByBucket,
  aggregatePaidByBucket,
  aggregateProjectStatusCounts,
  aggregateTopCustomersByInvoiced,
  aggregateTopProductsByInvoiced,
  countCreatedInPeriod,
  CUSTOMERS,
  listProjectsDueAttention,
  mergeFinancialTrendPoints,
  PRODUCTS,
  PROJECTS,
} from "@/server/analytics/queries";
import type { AnalyticsSnapshot } from "@/server/analytics/types";
import type { SessionContext } from "@/server/auth/types";
import {
  aggregateInvoiceTotalsByCurrency,
  aggregateOutstandingAndOverdue,
  aggregatePaymentTotalsByCurrency,
  buildCurrencyMetrics,
} from "@/server/dashboard/queries";
import { ensureCustomerIndexes } from "@/server/customers/repository";
import { ensureInvoiceIndexes } from "@/server/invoices/repository";
import { ensurePaymentIndexes } from "@/server/payments/repository";
import { ensureProductIndexes } from "@/server/products/repository";
import { ensureProjectIndexes } from "@/server/projects/repository";

function assertAnalyticsRead(session: SessionContext) {
  const permissions = session.membership.permissions;
  const required = [
    "invoices.read",
    "payments.read",
    "customers.read",
    "products.read",
    "projects.read",
  ] as const;

  const missing = required.filter((permission) => !permissions.includes(permission));
  if (missing.length > 0) {
    throw new AppError({
      code: "FORBIDDEN",
      message: "Missing analytics read permissions",
      userMessage: "You do not have permission to view analytics.",
    });
  }
}

/**
 * Analytics composes dashboard financial aggregations plus bounded
 * customer/product/project insights. No separate analytics collection.
 */
export async function getAnalyticsSnapshotForSession(
  session: SessionContext,
  rawQuery: unknown,
  now: Date = new Date(),
): Promise<AnalyticsSnapshot> {
  assertAnalyticsRead(session);
  await Promise.all([
    ensureInvoiceIndexes(),
    ensurePaymentIndexes(),
    ensureCustomerIndexes(),
    ensureProductIndexes(),
    ensureProjectIndexes(),
  ]);

  const parsed = parseWithSchema(dashboardRangeQuerySchema, rawQuery ?? {});
  if (!parsed.ok) {
    throw parsed.error;
  }

  const rangeDays = parsed.data.range as DashboardRangeDays;
  const period = dashboardPeriodBounds(rangeDays, now);
  const todayStart = utcTodayStart(now);
  const dueSoonEndExclusive = new Date(
    Date.UTC(
      todayStart.getUTCFullYear(),
      todayStart.getUTCMonth(),
      todayStart.getUTCDate() + 14,
    ),
  );
  const workspaceId = session.workspace.id;
  const bucket = analyticsBucketForRange(rangeDays);

  const [
    invoiced,
    paid,
    outstandingBundle,
    newCustomers,
    newProducts,
    newProjects,
    projectStatusCounts,
    projectsDueAttention,
  ] = await Promise.all([
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
      limit: 1,
    }),
    countCreatedInPeriod({
      collection: CUSTOMERS,
      workspaceId,
      start: period.start,
      endExclusive: period.endExclusive,
    }),
    countCreatedInPeriod({
      collection: PRODUCTS,
      workspaceId,
      start: period.start,
      endExclusive: period.endExclusive,
    }),
    countCreatedInPeriod({
      collection: PROJECTS,
      workspaceId,
      start: period.start,
      endExclusive: period.endExclusive,
    }),
    aggregateProjectStatusCounts({ workspaceId }),
    listProjectsDueAttention({
      workspaceId,
      todayStart,
      dueSoonEndExclusive,
      limit: 8,
    }),
  ]);

  const metricsByCurrency = buildCurrencyMetrics({
    invoiced,
    paid,
    outstanding: outstandingBundle.metrics,
  });
  const primaryCurrency = pickPrimaryCurrency(metricsByCurrency);
  const primaryMetrics = primaryCurrency
    ? metricsByCurrency.find((row) => row.currency === primaryCurrency)
    : undefined;

  const [invoicedBuckets, paidBuckets, topCustomersByInvoiced, customersWithOutstanding, topProductsByInvoiced] =
    primaryCurrency
      ? await Promise.all([
          aggregateInvoicedByBucket({
            workspaceId,
            currency: primaryCurrency,
            start: period.start,
            endExclusive: period.endExclusive,
            bucket,
          }),
          aggregatePaidByBucket({
            workspaceId,
            currency: primaryCurrency,
            start: period.start,
            endExclusive: period.endExclusive,
            bucket,
          }),
          aggregateTopCustomersByInvoiced({
            workspaceId,
            currency: primaryCurrency,
            start: period.start,
            endExclusive: period.endExclusive,
            limit: 8,
          }),
          aggregateCustomersWithOutstanding({
            workspaceId,
            currency: primaryCurrency,
            start: period.start,
            endExclusive: period.endExclusive,
            todayStart,
            limit: 8,
          }),
          aggregateTopProductsByInvoiced({
            workspaceId,
            currency: primaryCurrency,
            start: period.start,
            endExclusive: period.endExclusive,
            limit: 8,
          }),
        ])
      : [[], [], [], [], []];

  const points = primaryCurrency
    ? mergeFinancialTrendPoints({
        startDateOnly: period.startDateOnly,
        endDateOnly: period.endDateOnly,
        bucket,
        invoiced: invoicedBuckets,
        paid: paidBuckets,
      })
    : [];

  const invoiceCountInPeriod = invoiced.reduce((sum, row) => sum + row.count, 0);
  const paymentCountInPeriod = paid.reduce((sum, row) => sum + row.count, 0);

  const signals = buildAnalyticsSignals({
    primary: primaryMetrics,
    overdueCount: outstandingBundle.overdueCount,
    outstandingCount: outstandingBundle.outstandingCount,
    invoiceCountInPeriod,
    paymentCountInPeriod,
    projectStatusCounts,
  });

  return {
    period: {
      rangeDays,
      startDateOnly: period.startDateOnly,
      endDateOnly: period.endDateOnly,
    },
    metricsByCurrency,
    primaryCurrency,
    counts: {
      invoiceCountInPeriod,
      paymentCountInPeriod,
      paidInvoiceCount: outstandingBundle.paidInvoiceCount,
      outstandingCount: outstandingBundle.outstandingCount,
      overdueCount: outstandingBundle.overdueCount,
      newCustomers,
      newProducts,
      newProjects,
    },
    financialTrend: {
      currency: primaryCurrency,
      bucket,
      rangeDays,
      points,
    },
    topCustomersByInvoiced,
    customersWithOutstanding,
    topProductsByInvoiced,
    projectStatusCounts,
    projectsDueAttention,
    signals,
  };
}
