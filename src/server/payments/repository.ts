import "server-only";

import { ObjectId, type Filter } from "mongodb";

import { moneyToCents, centsToMoney } from "@/features/invoices/money";
import {
  dateOnlyToUtcDate,
  utcDateToDateOnly,
  type PaymentMethod,
} from "@/features/payments/schemas";
import { getDb } from "@/server/db/mongodb";
import type { PaymentDocument, PaymentDTO } from "@/server/payments/types";

const PAYMENTS = "payments";

/**
 * Process-scoped ensure: createIndexes runs at most once per warm runtime.
 * Failures clear the promise so the next call can retry.
 */
let paymentIndexesPromise: Promise<void> | undefined;

async function createPaymentIndexes() {
  const db = getDb();
  await db.collection(PAYMENTS).createIndexes([
    {
      key: { workspaceId: 1, createdAt: -1 },
      name: "payments_workspace_createdAt",
    },
    {
      key: { workspaceId: 1, invoiceId: 1, createdAt: -1 },
      name: "payments_workspace_invoiceId",
    },
    {
      key: { workspaceId: 1, customerId: 1 },
      name: "payments_workspace_customerId",
    },
    {
      key: { workspaceId: 1, paymentDate: -1 },
      name: "payments_workspace_paymentDate",
    },
  ]);
}

export async function ensurePaymentIndexes() {
  if (!paymentIndexesPromise) {
    paymentIndexesPromise = createPaymentIndexes().catch((error: unknown) => {
      paymentIndexesPromise = undefined;
      throw error;
    });
  }

  return paymentIndexesPromise;
}

/** Test helper — clear the process-level index ensure guard. */
export function resetPaymentIndexesForTests() {
  paymentIndexesPromise = undefined;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function toPaymentDTO(doc: PaymentDocument): PaymentDTO {
  return {
    id: doc._id.toHexString(),
    invoiceId: doc.invoiceId,
    invoiceNumberSnapshot: doc.invoiceNumberSnapshot,
    customerId: doc.customerId,
    customerNameSnapshot: doc.customerNameSnapshot,
    amount: doc.amount,
    currency: doc.currency,
    paymentDate: utcDateToDateOnly(doc.paymentDate),
    method: doc.method,
    reference: doc.reference,
    notes: doc.notes,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export async function insertPayment(input: {
  workspaceId: string;
  createdByUserId: string;
  invoiceId: string;
  invoiceNumberSnapshot: string;
  customerId: string;
  customerNameSnapshot: string;
  amount: number;
  currency: string;
  paymentDate: string;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
}): Promise<PaymentDocument> {
  const db = getDb();
  const now = new Date();
  const doc: PaymentDocument = {
    _id: new ObjectId(),
    workspaceId: input.workspaceId,
    invoiceId: input.invoiceId,
    invoiceNumberSnapshot: input.invoiceNumberSnapshot,
    customerId: input.customerId,
    customerNameSnapshot: input.customerNameSnapshot,
    amount: input.amount,
    currency: input.currency,
    paymentDate: dateOnlyToUtcDate(input.paymentDate),
    method: input.method,
    reference: input.reference,
    notes: input.notes,
    createdByUserId: input.createdByUserId,
    createdAt: now,
    updatedAt: now,
  };

  await db.collection<PaymentDocument>(PAYMENTS).insertOne(doc);
  return doc;
}

export async function deletePaymentInWorkspace(options: {
  workspaceId: string;
  paymentId: string;
}): Promise<boolean> {
  if (!ObjectId.isValid(options.paymentId)) {
    return false;
  }

  const db = getDb();
  const result = await db.collection<PaymentDocument>(PAYMENTS).deleteOne({
    _id: new ObjectId(options.paymentId),
    workspaceId: options.workspaceId,
  });

  return result.deletedCount === 1;
}

export async function findPaymentInWorkspace(options: {
  workspaceId: string;
  paymentId: string;
}): Promise<PaymentDocument | null> {
  if (!ObjectId.isValid(options.paymentId)) {
    return null;
  }

  const db = getDb();
  return db.collection<PaymentDocument>(PAYMENTS).findOne({
    _id: new ObjectId(options.paymentId),
    workspaceId: options.workspaceId,
  });
}

export async function listPaymentsInWorkspace(options: {
  workspaceId: string;
  q?: string;
  page: number;
  pageSize: number;
}): Promise<{ items: PaymentDocument[]; total: number }> {
  const db = getDb();
  const filter: Filter<PaymentDocument> = {
    workspaceId: options.workspaceId,
  };

  if (options.q) {
    const pattern = escapeRegex(options.q.slice(0, 100));
    const regex = { $regex: pattern, $options: "i" as const };
    filter.$or = [
      { invoiceNumberSnapshot: regex },
      { customerNameSnapshot: regex },
      { reference: regex },
    ];
  }

  const collection = db.collection<PaymentDocument>(PAYMENTS);
  const skip = (options.page - 1) * options.pageSize;

  const [items, total] = await Promise.all([
    collection
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(options.pageSize)
      .toArray(),
    collection.countDocuments(filter),
  ]);

  return { items, total };
}

export async function listPaymentsForInvoiceInWorkspace(options: {
  workspaceId: string;
  invoiceId: string;
}): Promise<PaymentDocument[]> {
  const db = getDb();
  return db
    .collection<PaymentDocument>(PAYMENTS)
    .find({
      workspaceId: options.workspaceId,
      invoiceId: options.invoiceId,
    })
    .sort({ paymentDate: -1, createdAt: -1 })
    .toArray();
}

/**
 * Sum recorded payment amounts for an invoice using integer cents.
 */
export async function sumPaymentsForInvoiceInWorkspace(options: {
  workspaceId: string;
  invoiceId: string;
}): Promise<{ amountPaid: number; paymentCount: number }> {
  const totals = await sumPaymentsByInvoiceIdsInWorkspace({
    workspaceId: options.workspaceId,
    invoiceIds: [options.invoiceId],
  });
  return (
    totals.get(options.invoiceId) ?? { amountPaid: 0, paymentCount: 0 }
  );
}

/** Batch sum payments for many invoices (workspace-scoped). */
export async function sumPaymentsByInvoiceIdsInWorkspace(options: {
  workspaceId: string;
  invoiceIds: string[];
}): Promise<Map<string, { amountPaid: number; paymentCount: number }>> {
  const result = new Map<string, { amountPaid: number; paymentCount: number }>();
  if (options.invoiceIds.length === 0) {
    return result;
  }

  const db = getDb();
  const rows = await db
    .collection<PaymentDocument>(PAYMENTS)
    .aggregate<{
      _id: string;
      totalCents: number;
      paymentCount: number;
    }>([
      {
        $match: {
          workspaceId: options.workspaceId,
          invoiceId: { $in: options.invoiceIds },
        },
      },
      {
        $group: {
          _id: "$invoiceId",
          totalCents: {
            $sum: {
              $round: [{ $multiply: ["$amount", 100] }, 0],
            },
          },
          paymentCount: { $sum: 1 },
        },
      },
    ])
    .toArray();

  for (const row of rows) {
    result.set(row._id, {
      amountPaid: centsToMoney(row.totalCents),
      paymentCount: row.paymentCount,
    });
  }

  return result;
}

/** Remaining balance helper (cents-safe). */
export function remainingBalance(invoiceTotal: number, amountPaid: number) {
  return centsToMoney(moneyToCents(invoiceTotal) - moneyToCents(amountPaid));
}
