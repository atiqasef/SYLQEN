import type { InvoiceStatus } from "@/features/invoices/schemas";
import type { PaymentMethod } from "@/features/payments/schemas";
import type { DashboardCurrencyMetrics } from "@/features/dashboard/money";
import type { DashboardRangeDays } from "@/features/dashboard/schemas";

export type DashboardPeriod = {
  rangeDays: DashboardRangeDays;
  startDateOnly: string;
  endDateOnly: string;
};

export type DashboardPaymentTrendPoint = {
  date: string;
  amount: number;
};

export type DashboardOutstandingInvoice = {
  id: string;
  invoiceNumber: string;
  customerNameSnapshot: string;
  dueDate: string;
  currency: string;
  total: number;
  amountPaid: number;
  remaining: number;
  status: InvoiceStatus;
  isOverdue: boolean;
};

export type DashboardRecentPayment = {
  id: string;
  amount: number;
  currency: string;
  invoiceId: string;
  invoiceNumberSnapshot: string;
  customerNameSnapshot: string;
  method: PaymentMethod;
  paymentDate: string;
};

export type DashboardRecentInvoice = {
  id: string;
  invoiceNumber: string;
  customerNameSnapshot: string;
  status: InvoiceStatus;
  total: number;
  currency: string;
  issueDate: string;
  dueDate: string;
};

export type DashboardFinancialSnapshot = {
  period: DashboardPeriod;
  metricsByCurrency: DashboardCurrencyMetrics[];
  primaryCurrency?: string;
  paymentTrend: DashboardPaymentTrendPoint[];
  outstandingInvoices: DashboardOutstandingInvoice[];
  recentPayments: DashboardRecentPayment[];
  recentInvoices: DashboardRecentInvoice[];
  counts: {
    invoiceCountInPeriod: number;
    paymentCountInPeriod: number;
    paidInvoiceCount: number;
    outstandingCount: number;
    overdueCount: number;
  };
};
