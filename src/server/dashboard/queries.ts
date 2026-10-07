import "server-only";

import { centsToMoney, moneyToCents } from "@/features/invoices/money";
import { utcDateToDateOnly } from "@/features/invoices/schemas";
import {
  mergeCurrencyMetrics,
  remainingFromTotals,
  type DashboardCurrencyMetrics,
} from "@/features/dashboard/money";
import { getDb } from "@/server/db/mongodb";
import type { InvoiceDocument } from "@/server/invoices/types";
import type { PaymentDocument } from "@/server/payments/types";
import type {
  DashboardOutstandingInvoice,
  DashboardPaymentTrendPoint,
  DashboardRecentInvoice,
  DashboardRecentPayment,
} from "@/server/dashboard/types";

const INVOICES = "invoices";
const PAYMENTS = "payments";

function amountToCentsExpr(field: string) {
  return {
    $round: [{ $multiply: [`$${field}`, 100] }, 0],
  };
}

export async function aggregateInvoiceTotalsByCurrency(options: {
  workspaceId: string;
  start: Date;
  endExclusive: Date;
}): Promise<Array<{ currency: string; totalInvoicedCents: number; count: number }>> {
  const db = getDb();
  const rows = await db
    .collection<InvoiceDocument>(INVOICES)
    .aggregate<{
      _id: string;
      totalInvoicedCents: number;
      count: number;
    }>([
      {
        $match: {
          workspaceId: options.workspaceId,
          status: { $ne: "draft" },
          issueDate: {
            $gte: options.start,
            $lt: options.endExclusive,
          },
        },
      },
      {
        $group: {
          _id: "$currency",
          totalInvoicedCents: { $sum: amountToCentsExpr("total") },
          count: { $sum: 1 },
        },
      },
    ])
    .toArray();

  return rows.map((row) => ({
    currency: row._id,
    totalInvoicedCents: row.totalInvoicedCents,
    count: row.count,
  }));
}

export async function aggregatePaymentTotalsByCurrency(options: {
  workspaceId: string;
  start: Date;
  endExclusive: Date;
}): Promise<Array<{ currency: string; totalPaidCents: number; count: number }>> {
  const db = getDb();
  const rows = await db
    .collection<PaymentDocument>(PAYMENTS)
    .aggregate<{
      _id: string;
      totalPaidCents: number;
      count: number;
    }>([
      {
        $match: {
          workspaceId: options.workspaceId,
          paymentDate: {
            $gte: options.start,
            $lt: options.endExclusive,
          },
        },
      },
      {
        $group: {
          _id: "$currency",
          totalPaidCents: { $sum: amountToCentsExpr("amount") },
          count: { $sum: 1 },
        },
      },
    ])
    .toArray();

  return rows.map((row) => ({
    currency: row._id,
    totalPaidCents: row.totalPaidCents,
    count: row.count,
  }));
}

export async function aggregatePaymentTrend(options: {
  workspaceId: string;
  currency: string;
  start: Date;
  endExclusive: Date;
}): Promise<DashboardPaymentTrendPoint[]> {
  const db = getDb();
  const rows = await db
    .collection<PaymentDocument>(PAYMENTS)
    .aggregate<{
      _id: string;
      totalCents: number;
    }>([
      {
        $match: {
          workspaceId: options.workspaceId,
          currency: options.currency,
          paymentDate: {
            $gte: options.start,
            $lt: options.endExclusive,
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$paymentDate",
              timezone: "UTC",
            },
          },
          totalCents: { $sum: amountToCentsExpr("amount") },
        },
      },
      { $sort: { _id: 1 } },
    ])
    .toArray();

  return rows.map((row) => ({
    date: row._id,
    amount: centsToMoney(row.totalCents),
  }));
}

type InvoiceBalanceRow = {
  _id: InvoiceDocument["_id"];
  invoiceNumber: string;
  customerNameSnapshot: string;
  dueDate: Date;
  issueDate: Date;
  currency: string;
  total: number;
  status: InvoiceDocument["status"];
  paidCents: number;
};

async function loadInvoiceBalances(options: {
  workspaceId: string;
  start: Date;
  endExclusive: Date;
}): Promise<InvoiceBalanceRow[]> {
  const db = getDb();
  return db
    .collection<InvoiceDocument>(INVOICES)
    .aggregate<InvoiceBalanceRow>([
      {
        $match: {
          workspaceId: options.workspaceId,
          status: { $ne: "draft" },
          issueDate: {
            $gte: options.start,
            $lt: options.endExclusive,
          },
        },
      },
      {
        $addFields: {
          invoiceIdString: { $toString: "$_id" },
        },
      },
      {
        $lookup: {
          from: PAYMENTS,
          let: {
            invoiceId: "$invoiceIdString",
            workspaceId: "$workspaceId",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$workspaceId", "$$workspaceId"] },
                    { $eq: ["$invoiceId", "$$invoiceId"] },
                  ],
                },
              },
            },
            {
              $group: {
                _id: null,
                paidCents: { $sum: amountToCentsExpr("amount") },
              },
            },
          ],
          as: "paymentAgg",
        },
      },
      {
        $addFields: {
          paidCents: {
            $ifNull: [{ $arrayElemAt: ["$paymentAgg.paidCents", 0] }, 0],
          },
        },
      },
      {
        $project: {
          invoiceNumber: 1,
          customerNameSnapshot: 1,
          dueDate: 1,
          issueDate: 1,
          currency: 1,
          total: 1,
          status: 1,
          paidCents: 1,
        },
      },
    ])
    .toArray();
}

export async function aggregateOutstandingAndOverdue(options: {
  workspaceId: string;
  start: Date;
  endExclusive: Date;
  todayStart: Date;
}): Promise<{
  metrics: DashboardCurrencyMetrics[];
  outstandingInvoices: DashboardOutstandingInvoice[];
  outstandingCount: number;
  overdueCount: number;
}> {
  const rows = await loadInvoiceBalances(options);
  const metricRows: Array<{
    currency: string;
    outstandingCents?: number;
    overdueCents?: number;
  }> = [];

  const outstandingInvoices: DashboardOutstandingInvoice[] = [];
  let outstandingCount = 0;
  let overdueCount = 0;

  for (const row of rows) {
    const amountPaid = centsToMoney(row.paidCents);
    const remaining = remainingFromTotals(row.total, amountPaid);
    if (remaining <= 0) {
      continue;
    }

    outstandingCount += 1;
    const isOverdue =
      row.status === "overdue" || row.dueDate.getTime() < options.todayStart.getTime();

    metricRows.push({
      currency: row.currency,
      outstandingCents: moneyToCents(remaining),
      overdueCents: isOverdue ? moneyToCents(remaining) : 0,
    });

    if (isOverdue) {
      overdueCount += 1;
    }

    outstandingInvoices.push({
      id: row._id.toHexString(),
      invoiceNumber: row.invoiceNumber,
      customerNameSnapshot: row.customerNameSnapshot,
      dueDate: utcDateToDateOnly(row.dueDate),
      currency: row.currency,
      total: row.total,
      amountPaid,
      remaining,
      status: row.status,
      isOverdue,
    });
  }

  outstandingInvoices.sort((a, b) => {
    if (a.isOverdue !== b.isOverdue) {
      return a.isOverdue ? -1 : 1;
    }
    return a.dueDate.localeCompare(b.dueDate);
  });

  return {
    metrics: mergeCurrencyMetrics(metricRows),
    outstandingInvoices: outstandingInvoices.slice(0, 8),
    outstandingCount,
    overdueCount,
  };
}

export async function listRecentPaymentsForDashboard(options: {
  workspaceId: string;
  limit: number;
}): Promise<DashboardRecentPayment[]> {
  const db = getDb();
  const docs = await db
    .collection<PaymentDocument>(PAYMENTS)
    .find({ workspaceId: options.workspaceId })
    .sort({ createdAt: -1 })
    .limit(options.limit)
    .toArray();

  return docs.map((doc) => ({
    id: doc._id.toHexString(),
    amount: doc.amount,
    currency: doc.currency,
    invoiceId: doc.invoiceId,
    invoiceNumberSnapshot: doc.invoiceNumberSnapshot,
    customerNameSnapshot: doc.customerNameSnapshot,
    method: doc.method,
    paymentDate: utcDateToDateOnly(doc.paymentDate),
  }));
}

export async function listRecentInvoicesForDashboard(options: {
  workspaceId: string;
  limit: number;
}): Promise<DashboardRecentInvoice[]> {
  const db = getDb();
  const docs = await db
    .collection<InvoiceDocument>(INVOICES)
    .find({ workspaceId: options.workspaceId })
    .sort({ createdAt: -1 })
    .limit(options.limit)
    .toArray();

  return docs.map((doc) => ({
    id: doc._id.toHexString(),
    invoiceNumber: doc.invoiceNumber,
    customerNameSnapshot: doc.customerNameSnapshot,
    status: doc.status,
    total: doc.total,
    currency: doc.currency,
    issueDate: utcDateToDateOnly(doc.issueDate),
    dueDate: utcDateToDateOnly(doc.dueDate),
  }));
}

export function buildCurrencyMetrics(options: {
  invoiced: Array<{ currency: string; totalInvoicedCents: number }>;
  paid: Array<{ currency: string; totalPaidCents: number }>;
  outstanding: DashboardCurrencyMetrics[];
}): DashboardCurrencyMetrics[] {
  const outstandingByCurrency = new Map(
    options.outstanding.map((row) => [row.currency, row]),
  );

  const rows = [
    ...options.invoiced.map((row) => ({
      currency: row.currency,
      totalInvoicedCents: row.totalInvoicedCents,
    })),
    ...options.paid.map((row) => ({
      currency: row.currency,
      totalPaidCents: row.totalPaidCents,
    })),
    ...options.outstanding.map((row) => ({
      currency: row.currency,
      outstandingCents: Math.round(row.outstanding * 100),
      overdueCents: Math.round(row.overdue * 100),
    })),
  ];

  const merged = mergeCurrencyMetrics(rows);

  // Ensure outstanding/overdue from balance pass are authoritative when present.
  return merged.map((row) => {
    const fromBalance = outstandingByCurrency.get(row.currency);
    if (!fromBalance) {
      return row;
    }
    return {
      ...row,
      outstanding: fromBalance.outstanding,
      overdue: fromBalance.overdue,
    };
  });
}
