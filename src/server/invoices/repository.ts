import "server-only";

import type { UpdateFilter } from "mongodb";
import { ObjectId, type Filter } from "mongodb";

import {
  dateOnlyToUtcDate,
  formatInvoiceNumber,
  utcDateToDateOnly,
  type InvoiceStatus,
} from "@/features/invoices/schemas";
import { getDb } from "@/server/db/mongodb";
import type {
  InvoiceCounterDocument,
  InvoiceDocument,
  InvoiceDTO,
  InvoiceLineItemDocument,
} from "@/server/invoices/types";

const INVOICES = "invoices";
const COUNTERS = "counters";

/**
 * Process-scoped ensure: createIndexes runs at most once per warm runtime.
 * Failures clear the promise so the next call can retry.
 */
let invoiceIndexesPromise: Promise<void> | undefined;

async function createInvoiceIndexes() {
  const db = getDb();
  await db.collection(INVOICES).createIndexes([
    {
      key: { workspaceId: 1, invoiceNumber: 1 },
      unique: true,
      name: "invoices_workspace_invoiceNumber_unique",
    },
    {
      key: { workspaceId: 1, createdAt: -1 },
      name: "invoices_workspace_createdAt",
    },
    {
      key: { workspaceId: 1, customerId: 1 },
      name: "invoices_workspace_customerId",
    },
    {
      key: { workspaceId: 1, status: 1 },
      name: "invoices_workspace_status",
    },
    {
      key: { workspaceId: 1, customerNameSnapshot: 1 },
      name: "invoices_workspace_customerName",
    },
  ]);
}

export async function ensureInvoiceIndexes() {
  if (!invoiceIndexesPromise) {
    invoiceIndexesPromise = createInvoiceIndexes().catch((error: unknown) => {
      invoiceIndexesPromise = undefined;
      throw error;
    });
  }

  return invoiceIndexesPromise;
}

/** Test helper — clear the process-level index ensure guard. */
export function resetInvoiceIndexesForTests() {
  invoiceIndexesPromise = undefined;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function counterIdForWorkspace(workspaceId: string) {
  return `invoiceNumber:${workspaceId}`;
}

/**
 * Atomically allocate the next invoice sequence for a workspace.
 * Avoids "count + 1" races under concurrent creates.
 */
export async function allocateInvoiceNumber(
  workspaceId: string,
): Promise<string> {
  const db = getDb();
  const result = await db
    .collection<InvoiceCounterDocument>(COUNTERS)
    .findOneAndUpdate(
      { _id: counterIdForWorkspace(workspaceId) },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: "after" },
    );

  const seq = result?.seq;
  if (!seq || seq < 1) {
    throw new Error("Failed to allocate invoice number sequence");
  }

  return formatInvoiceNumber(seq);
}

export function toInvoiceDTO(doc: InvoiceDocument): InvoiceDTO {
  return {
    id: doc._id.toHexString(),
    invoiceNumber: doc.invoiceNumber,
    customerId: doc.customerId,
    customerNameSnapshot: doc.customerNameSnapshot,
    status: doc.status,
    issueDate: utcDateToDateOnly(doc.issueDate),
    dueDate: utcDateToDateOnly(doc.dueDate),
    currency: doc.currency,
    notes: doc.notes,
    lineItems: doc.lineItems.map((item) => ({ ...item })),
    subtotal: doc.subtotal,
    total: doc.total,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export async function insertInvoice(input: {
  workspaceId: string;
  createdByUserId: string;
  invoiceNumber: string;
  customerId: string;
  customerNameSnapshot: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  currency: string;
  notes?: string;
  lineItems: InvoiceLineItemDocument[];
  subtotal: number;
  total: number;
}): Promise<InvoiceDocument> {
  const db = getDb();
  const now = new Date();
  const doc: InvoiceDocument = {
    _id: new ObjectId(),
    workspaceId: input.workspaceId,
    invoiceNumber: input.invoiceNumber,
    customerId: input.customerId,
    customerNameSnapshot: input.customerNameSnapshot,
    status: input.status,
    issueDate: dateOnlyToUtcDate(input.issueDate),
    dueDate: dateOnlyToUtcDate(input.dueDate),
    currency: input.currency,
    notes: input.notes,
    lineItems: input.lineItems,
    subtotal: input.subtotal,
    total: input.total,
    createdByUserId: input.createdByUserId,
    createdAt: now,
    updatedAt: now,
  };

  await db.collection<InvoiceDocument>(INVOICES).insertOne(doc);
  return doc;
}

export async function updateInvoiceInWorkspace(options: {
  workspaceId: string;
  invoiceId: string;
  patch: {
    customerId: string;
    customerNameSnapshot: string;
    status: InvoiceStatus;
    issueDate: string;
    dueDate: string;
    currency: string;
    notes?: string;
    lineItems: InvoiceLineItemDocument[];
    subtotal: number;
    total: number;
  };
}): Promise<InvoiceDocument | null> {
  if (!ObjectId.isValid(options.invoiceId)) {
    return null;
  }

  const db = getDb();
  const $set: Record<string, unknown> = {
    customerId: options.patch.customerId,
    customerNameSnapshot: options.patch.customerNameSnapshot,
    status: options.patch.status,
    issueDate: dateOnlyToUtcDate(options.patch.issueDate),
    dueDate: dateOnlyToUtcDate(options.patch.dueDate),
    currency: options.patch.currency,
    lineItems: options.patch.lineItems,
    subtotal: options.patch.subtotal,
    total: options.patch.total,
    updatedAt: new Date(),
  };
  const $unset: Record<string, ""> = {};

  if (options.patch.notes) {
    $set.notes = options.patch.notes;
  } else {
    $unset.notes = "";
  }

  const update: UpdateFilter<InvoiceDocument> = { $set };
  if (Object.keys($unset).length > 0) {
    update.$unset = $unset;
  }

  const result = await db.collection<InvoiceDocument>(INVOICES).findOneAndUpdate(
    {
      _id: new ObjectId(options.invoiceId),
      workspaceId: options.workspaceId,
    },
    update,
    { returnDocument: "after" },
  );

  return result ?? null;
}

export async function findInvoiceInWorkspace(options: {
  workspaceId: string;
  invoiceId: string;
}): Promise<InvoiceDocument | null> {
  if (!ObjectId.isValid(options.invoiceId)) {
    return null;
  }

  const db = getDb();
  return db.collection<InvoiceDocument>(INVOICES).findOne({
    _id: new ObjectId(options.invoiceId),
    workspaceId: options.workspaceId,
  });
}

/** Update invoice status only (e.g. mark paid after settlement). */
export async function updateInvoiceStatusInWorkspace(options: {
  workspaceId: string;
  invoiceId: string;
  status: InvoiceStatus;
}): Promise<InvoiceDocument | null> {
  if (!ObjectId.isValid(options.invoiceId)) {
    return null;
  }

  const db = getDb();
  const result = await db.collection<InvoiceDocument>(INVOICES).findOneAndUpdate(
    {
      _id: new ObjectId(options.invoiceId),
      workspaceId: options.workspaceId,
    },
    {
      $set: {
        status: options.status,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" },
  );

  return result ?? null;
}

export async function listInvoicesInWorkspace(options: {
  workspaceId: string;
  q?: string;
  page: number;
  pageSize: number;
}): Promise<{ items: InvoiceDocument[]; total: number }> {
  const db = getDb();
  const filter: Filter<InvoiceDocument> = {
    workspaceId: options.workspaceId,
  };

  if (options.q) {
    const pattern = escapeRegex(options.q.slice(0, 100));
    const regex = { $regex: pattern, $options: "i" as const };
    filter.$or = [{ invoiceNumber: regex }, { customerNameSnapshot: regex }];
  }

  const collection = db.collection<InvoiceDocument>(INVOICES);
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
