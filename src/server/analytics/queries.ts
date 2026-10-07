import "server-only";

import { centsToMoney, moneyToCents } from "@/features/invoices/money";
import { utcDateToDateOnly } from "@/features/invoices/schemas";
import { enumerateBucketKeys } from "@/features/analytics/buckets";
import { remainingFromTotals } from "@/features/dashboard/money";
import type { ProjectStatus } from "@/features/projects/schemas";
import { PROJECT_STATUSES } from "@/features/projects/schemas";
import { getDb } from "@/server/db/mongodb";
import type { InvoiceDocument } from "@/server/invoices/types";
import type { PaymentDocument } from "@/server/payments/types";
import type { ProjectDocument } from "@/server/projects/types";
import type {
  AnalyticsBucket,
  AnalyticsCustomerOutstanding,
  AnalyticsCustomerRank,
  AnalyticsFinancialTrendPoint,
  AnalyticsProductRank,
  AnalyticsProjectDueItem,
  AnalyticsProjectStatusCount,
} from "@/server/analytics/types";

const INVOICES = "invoices";
const PAYMENTS = "payments";
const CUSTOMERS = "customers";
const PRODUCTS = "products";
const PROJECTS = "projects";

function amountToCentsExpr(field: string) {
  return {
    $round: [{ $multiply: [`$${field}`, 100] }, 0],
  };
}

function bucketDateExpr(field: string, bucket: AnalyticsBucket) {
  if (bucket === "week") {
    return {
      $dateToString: {
        format: "%Y-%m-%d",
        date: {
          $dateTrunc: {
            date: `$${field}`,
            unit: "week",
            binSize: 1,
            timezone: "UTC",
            startOfWeek: "monday",
          },
        },
        timezone: "UTC",
      },
    };
  }

  return {
    $dateToString: {
      format: "%Y-%m-%d",
      date: `$${field}`,
      timezone: "UTC",
    },
  };
}

export async function aggregateInvoicedByBucket(options: {
  workspaceId: string;
  currency: string;
  start: Date;
  endExclusive: Date;
  bucket: AnalyticsBucket;
}): Promise<Array<{ bucket: string; totalCents: number }>> {
  const db = getDb();
  const rows = await db
    .collection<InvoiceDocument>(INVOICES)
    .aggregate<{ _id: string; totalCents: number }>([
      {
        $match: {
          workspaceId: options.workspaceId,
          currency: options.currency,
          status: { $ne: "draft" },
          issueDate: {
            $gte: options.start,
            $lt: options.endExclusive,
          },
        },
      },
      {
        $group: {
          _id: bucketDateExpr("issueDate", options.bucket),
          totalCents: { $sum: amountToCentsExpr("total") },
        },
      },
      { $sort: { _id: 1 } },
    ])
    .toArray();

  return rows.map((row) => ({
    bucket: row._id,
    totalCents: row.totalCents,
  }));
}

export async function aggregatePaidByBucket(options: {
  workspaceId: string;
  currency: string;
  start: Date;
  endExclusive: Date;
  bucket: AnalyticsBucket;
}): Promise<Array<{ bucket: string; totalCents: number }>> {
  const db = getDb();
  const rows = await db
    .collection<PaymentDocument>(PAYMENTS)
    .aggregate<{ _id: string; totalCents: number }>([
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
          _id: bucketDateExpr("paymentDate", options.bucket),
          totalCents: { $sum: amountToCentsExpr("amount") },
        },
      },
      { $sort: { _id: 1 } },
    ])
    .toArray();

  return rows.map((row) => ({
    bucket: row._id,
    totalCents: row.totalCents,
  }));
}

/** Merge invoiced/paid bucket series and fill empty buckets in the period. */
export function mergeFinancialTrendPoints(options: {
  startDateOnly: string;
  endDateOnly: string;
  bucket: AnalyticsBucket;
  invoiced: Array<{ bucket: string; totalCents: number }>;
  paid: Array<{ bucket: string; totalCents: number }>;
}): AnalyticsFinancialTrendPoint[] {
  const invoicedMap = new Map(
    options.invoiced.map((row) => [row.bucket, row.totalCents]),
  );
  const paidMap = new Map(options.paid.map((row) => [row.bucket, row.totalCents]));
  const keys = enumerateBucketKeys({
    startDateOnly: options.startDateOnly,
    endDateOnly: options.endDateOnly,
    bucket: options.bucket,
  });

  return keys.map((bucket) => ({
    bucket,
    invoiced: centsToMoney(invoicedMap.get(bucket) ?? 0),
    paid: centsToMoney(paidMap.get(bucket) ?? 0),
  }));
}

export async function countCreatedInPeriod(options: {
  collection: typeof CUSTOMERS | typeof PRODUCTS | typeof PROJECTS;
  workspaceId: string;
  start: Date;
  endExclusive: Date;
}): Promise<number> {
  const db = getDb();
  return db.collection(options.collection).countDocuments({
    workspaceId: options.workspaceId,
    createdAt: {
      $gte: options.start,
      $lt: options.endExclusive,
    },
  });
}

export async function aggregateTopCustomersByInvoiced(options: {
  workspaceId: string;
  currency: string;
  start: Date;
  endExclusive: Date;
  limit: number;
}): Promise<AnalyticsCustomerRank[]> {
  const db = getDb();
  const rows = await db
    .collection<InvoiceDocument>(INVOICES)
    .aggregate<{
      _id: string;
      customerName: string;
      totalCents: number;
      invoiceCount: number;
    }>([
      {
        $match: {
          workspaceId: options.workspaceId,
          currency: options.currency,
          status: { $ne: "draft" },
          issueDate: {
            $gte: options.start,
            $lt: options.endExclusive,
          },
        },
      },
      {
        $group: {
          _id: "$customerId",
          customerName: { $last: "$customerNameSnapshot" },
          totalCents: { $sum: amountToCentsExpr("total") },
          invoiceCount: { $sum: 1 },
        },
      },
      { $sort: { totalCents: -1, _id: 1 } },
      { $limit: options.limit },
    ])
    .toArray();

  return rows.map((row) => ({
    customerId: row._id,
    customerName: row.customerName,
    currency: options.currency,
    invoiced: centsToMoney(row.totalCents),
    invoiceCount: row.invoiceCount,
  }));
}

export async function aggregateCustomersWithOutstanding(options: {
  workspaceId: string;
  currency: string;
  start: Date;
  endExclusive: Date;
  todayStart: Date;
  limit: number;
}): Promise<AnalyticsCustomerOutstanding[]> {
  const db = getDb();
  const rows = await db
    .collection<InvoiceDocument>(INVOICES)
    .aggregate<{
      _id: string;
      customerName: string;
      outstandingCents: number;
      overdueCents: number;
      invoiceCount: number;
    }>([
      {
        $match: {
          workspaceId: options.workspaceId,
          currency: options.currency,
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
          totalCents: amountToCentsExpr("total"),
        },
      },
      {
        $addFields: {
          remainingCents: {
            $max: [{ $subtract: ["$totalCents", "$paidCents"] }, 0],
          },
          isOverdue: {
            $or: [
              { $eq: ["$status", "overdue"] },
              { $lt: ["$dueDate", options.todayStart] },
            ],
          },
        },
      },
      {
        $match: {
          remainingCents: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: "$customerId",
          customerName: { $last: "$customerNameSnapshot" },
          outstandingCents: { $sum: "$remainingCents" },
          overdueCents: {
            $sum: {
              $cond: ["$isOverdue", "$remainingCents", 0],
            },
          },
          invoiceCount: { $sum: 1 },
        },
      },
      { $sort: { overdueCents: -1, outstandingCents: -1, _id: 1 } },
      { $limit: options.limit },
    ])
    .toArray();

  return rows.map((row) => ({
    customerId: row._id,
    customerName: row.customerName,
    currency: options.currency,
    outstanding: centsToMoney(row.outstandingCents),
    overdue: centsToMoney(row.overdueCents),
    invoiceCount: row.invoiceCount,
  }));
}

export async function aggregateTopProductsByInvoiced(options: {
  workspaceId: string;
  currency: string;
  start: Date;
  endExclusive: Date;
  limit: number;
}): Promise<AnalyticsProductRank[]> {
  const db = getDb();
  const rows = await db
    .collection<InvoiceDocument>(INVOICES)
    .aggregate<{
      _id: string;
      productName: string;
      sku: string;
      totalCents: number;
      quantity: number;
    }>([
      {
        $match: {
          workspaceId: options.workspaceId,
          currency: options.currency,
          status: { $ne: "draft" },
          issueDate: {
            $gte: options.start,
            $lt: options.endExclusive,
          },
        },
      },
      { $unwind: "$lineItems" },
      {
        $group: {
          _id: "$lineItems.productId",
          productName: { $last: "$lineItems.productNameSnapshot" },
          sku: { $last: "$lineItems.skuSnapshot" },
          totalCents: { $sum: amountToCentsExpr("lineItems.lineTotal") },
          quantity: { $sum: "$lineItems.quantity" },
        },
      },
      { $sort: { totalCents: -1, _id: 1 } },
      { $limit: options.limit },
    ])
    .toArray();

  return rows.map((row) => ({
    productId: row._id,
    productName: row.productName,
    sku: row.sku,
    currency: options.currency,
    invoiced: centsToMoney(row.totalCents),
    quantity: row.quantity,
  }));
}

export async function aggregateProjectStatusCounts(options: {
  workspaceId: string;
}): Promise<AnalyticsProjectStatusCount[]> {
  const db = getDb();
  const rows = await db
    .collection<ProjectDocument>(PROJECTS)
    .aggregate<{ _id: ProjectStatus; count: number }>([
      { $match: { workspaceId: options.workspaceId } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ])
    .toArray();

  const byStatus = new Map(rows.map((row) => [row._id, row.count]));
  return PROJECT_STATUSES.map((status) => ({
    status,
    count: byStatus.get(status) ?? 0,
  }));
}

export async function listProjectsDueAttention(options: {
  workspaceId: string;
  todayStart: Date;
  dueSoonEndExclusive: Date;
  limit: number;
}): Promise<AnalyticsProjectDueItem[]> {
  const db = getDb();
  const docs = await db
    .collection<ProjectDocument>(PROJECTS)
    .find({
      workspaceId: options.workspaceId,
      status: { $in: ["planning", "active", "on_hold"] },
      dueDate: { $lt: options.dueSoonEndExclusive },
    })
    .sort({ dueDate: 1 })
    .limit(options.limit)
    .toArray();

  return docs
    .filter((doc): doc is ProjectDocument & { dueDate: Date } => Boolean(doc.dueDate))
    .map((doc) => {
      const dueDate = utcDateToDateOnly(doc.dueDate);
      const isOverdue = doc.dueDate.getTime() < options.todayStart.getTime();
      return {
        id: doc._id.toHexString(),
        name: doc.name,
        status: doc.status,
        dueDate,
        isOverdue,
      };
    });
}

/** Test helper — remaining balance classification uses shared cents math. */
export function remainingForAnalytics(total: number, paid: number): number {
  return remainingFromTotals(total, paid);
}

export function moneyCentsEqual(a: number, b: number): boolean {
  return moneyToCents(a) === moneyToCents(b);
}

export { CUSTOMERS, PRODUCTS, PROJECTS };
