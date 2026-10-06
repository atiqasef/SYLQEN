import type { ObjectId } from "mongodb";

import type { InvoiceStatus } from "@/features/invoices/schemas";

/**
 * Invoice records are workspace-scoped.
 * Authorization always uses trusted session.workspace.id — never browser input.
 */
export type InvoiceLineItemDocument = {
  productId: string;
  productNameSnapshot: string;
  skuSnapshot: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type InvoiceDocument = {
  _id: ObjectId;
  workspaceId: string;
  invoiceNumber: string;
  customerId: string;
  customerNameSnapshot: string;
  status: InvoiceStatus;
  issueDate: Date;
  dueDate: Date;
  currency: string;
  notes?: string;
  lineItems: InvoiceLineItemDocument[];
  subtotal: number;
  total: number;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type InvoiceLineItemDTO = {
  productId: string;
  productNameSnapshot: string;
  skuSnapshot: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

/** Safe client-facing invoice shape. Dates are YYYY-MM-DD where present. */
export type InvoiceDTO = {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerNameSnapshot: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  currency: string;
  notes?: string;
  lineItems: InvoiceLineItemDTO[];
  subtotal: number;
  total: number;
  createdAt: string;
  updatedAt: string;
};

export type InvoiceListResult = {
  items: InvoiceDTO[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export type InvoiceCounterDocument = {
  _id: string;
  seq: number;
};
