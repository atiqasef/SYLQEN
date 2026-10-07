import type { ProjectStatus } from "@/features/projects/schemas";
import type { DashboardCurrencyMetrics } from "@/features/dashboard/money";
import type { DashboardRangeDays } from "@/features/dashboard/schemas";
import type { DashboardPeriod } from "@/server/dashboard/types";

export type AnalyticsBucket = "day" | "week";

export type AnalyticsFinancialTrendPoint = {
  /** Bucket key (UTC date or week-start date, YYYY-MM-DD). */
  bucket: string;
  invoiced: number;
  paid: number;
};

export type AnalyticsCustomerRank = {
  customerId: string;
  customerName: string;
  currency: string;
  invoiced: number;
  invoiceCount: number;
};

export type AnalyticsCustomerOutstanding = {
  customerId: string;
  customerName: string;
  currency: string;
  outstanding: number;
  overdue: number;
  invoiceCount: number;
};

export type AnalyticsProductRank = {
  productId: string;
  productName: string;
  sku: string;
  currency: string;
  invoiced: number;
  quantity: number;
};

export type AnalyticsProjectStatusCount = {
  status: ProjectStatus;
  count: number;
};

export type AnalyticsProjectDueItem = {
  id: string;
  name: string;
  status: ProjectStatus;
  dueDate: string;
  isOverdue: boolean;
};

export type AnalyticsSignalSeverity = "attention" | "info";

export type AnalyticsSignal = {
  id: string;
  severity: AnalyticsSignalSeverity;
  title: string;
  detail: string;
  href?: string;
};

export type AnalyticsSnapshot = {
  period: DashboardPeriod;
  metricsByCurrency: DashboardCurrencyMetrics[];
  primaryCurrency?: string;
  counts: {
    invoiceCountInPeriod: number;
    paymentCountInPeriod: number;
    paidInvoiceCount: number;
    outstandingCount: number;
    overdueCount: number;
    newCustomers: number;
    newProducts: number;
    newProjects: number;
  };
  financialTrend: {
    currency?: string;
    bucket: AnalyticsBucket;
    rangeDays: DashboardRangeDays;
    points: AnalyticsFinancialTrendPoint[];
  };
  topCustomersByInvoiced: AnalyticsCustomerRank[];
  customersWithOutstanding: AnalyticsCustomerOutstanding[];
  topProductsByInvoiced: AnalyticsProductRank[];
  projectStatusCounts: AnalyticsProjectStatusCount[];
  projectsDueAttention: AnalyticsProjectDueItem[];
  signals: AnalyticsSignal[];
};
