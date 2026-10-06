import type { ObjectId } from "mongodb";

import type { PaymentMethod } from "@/features/payments/schemas";

/**
 * Payment records are workspace-scoped manual receipt records against invoices.
 * Provider-backed payments (e.g. Stripe) can extend this domain later without
 * replacing the core payment model.
 */
export type PaymentDocument = {
  _id: ObjectId;
  workspaceId: string;
  invoiceId: string;
  invoiceNumberSnapshot: string;
  customerId: string;
  customerNameSnapshot: string;
  amount: number;
  currency: string;
  paymentDate: Date;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
};

/** Safe client-facing payment shape. paymentDate is YYYY-MM-DD. */
export type PaymentDTO = {
  id: string;
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
  createdAt: string;
  updatedAt: string;
};

export type PaymentListResult = {
  items: PaymentDTO[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

/** Server-authoritative payment rollup for an invoice. */
export type InvoicePaymentSummary = {
  invoiceId: string;
  invoiceNumber: string;
  currency: string;
  invoiceTotal: number;
  amountPaid: number;
  remaining: number;
  paymentCount: number;
};
