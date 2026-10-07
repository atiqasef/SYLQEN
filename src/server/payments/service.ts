import "server-only";

import { AppError } from "@/lib/errors/app-error";
import { parseWithSchema } from "@/lib/validation/result";
import { moneyToCents } from "@/features/invoices/money";
import {
  paymentInputSchema,
  paymentListQuerySchema,
} from "@/features/payments/schemas";
import type { SessionContext } from "@/server/auth/types";
import { emitPaymentReceived } from "@/server/automations/events";
import {
  findInvoiceInWorkspace,
  updateInvoiceStatusInWorkspace,
} from "@/server/invoices/repository";
import {
  deletePaymentInWorkspace,
  ensurePaymentIndexes,
  findPaymentInWorkspace,
  insertPayment,
  listPaymentsInWorkspace,
  remainingBalance,
  sumPaymentsByInvoiceIdsInWorkspace,
  sumPaymentsForInvoiceInWorkspace,
  toPaymentDTO,
} from "@/server/payments/repository";
import type {
  InvoicePaymentSummary,
  PaymentDTO,
  PaymentListResult,
} from "@/server/payments/types";

function assertPermission(
  session: SessionContext,
  permission: SessionContext["membership"]["permissions"][number],
) {
  if (!session.membership.permissions.includes(permission)) {
    throw new AppError({
      code: "FORBIDDEN",
      message: `Missing permission: ${permission}`,
      userMessage: session.user.isDemo
        ? "Demo accounts are read-only. Payment changes are disabled."
        : "You do not have permission to perform this action.",
    });
  }
}

export async function listPaymentsForSession(
  session: SessionContext,
  rawQuery: unknown,
): Promise<PaymentListResult> {
  assertPermission(session, "payments.read");
  await ensurePaymentIndexes();

  const parsed = parseWithSchema(paymentListQuerySchema, rawQuery);
  if (!parsed.ok) {
    throw parsed.error;
  }

  const { q, page, pageSize } = parsed.data;
  const { items, total } = await listPaymentsInWorkspace({
    workspaceId: session.workspace.id,
    q,
    page,
    pageSize,
  });

  const pageCount = total === 0 ? 0 : Math.ceil(total / pageSize);

  return {
    items: items.map(toPaymentDTO),
    total,
    page,
    pageSize,
    pageCount,
  };
}

export async function getPaymentForSession(
  session: SessionContext,
  paymentId: string,
): Promise<PaymentDTO> {
  assertPermission(session, "payments.read");
  await ensurePaymentIndexes();

  const doc = await findPaymentInWorkspace({
    workspaceId: session.workspace.id,
    paymentId,
  });

  if (!doc) {
    throw new AppError({
      code: "NOT_FOUND",
      message: "Payment not found in workspace",
      userMessage: "Payment not found.",
    });
  }

  return toPaymentDTO(doc);
}

export async function getInvoicePaymentSummaryForSession(
  session: SessionContext,
  invoiceId: string,
): Promise<InvoicePaymentSummary> {
  assertPermission(session, "payments.read");
  await ensurePaymentIndexes();

  const invoice = await findInvoiceInWorkspace({
    workspaceId: session.workspace.id,
    invoiceId,
  });

  if (!invoice) {
    throw new AppError({
      code: "NOT_FOUND",
      message: "Invoice not found in workspace",
      userMessage: "Invoice not found.",
    });
  }

  const { amountPaid, paymentCount } = await sumPaymentsForInvoiceInWorkspace({
    workspaceId: session.workspace.id,
    invoiceId: invoice._id.toHexString(),
  });

  const remaining = remainingBalance(invoice.total, amountPaid);

  return {
    invoiceId: invoice._id.toHexString(),
    invoiceNumber: invoice.invoiceNumber,
    currency: invoice.currency,
    invoiceTotal: invoice.total,
    amountPaid,
    remaining: Math.max(0, remaining),
    paymentCount,
  };
}

export async function getInvoicePaymentSummariesForSession(
  session: SessionContext,
  invoiceIds: string[],
): Promise<Map<string, { amountPaid: number; paymentCount: number }>> {
  assertPermission(session, "payments.read");
  await ensurePaymentIndexes();

  return sumPaymentsByInvoiceIdsInWorkspace({
    workspaceId: session.workspace.id,
    invoiceIds,
  });
}

export async function createPaymentForSession(
  session: SessionContext,
  rawInput: unknown,
): Promise<PaymentDTO> {
  assertPermission(session, "payments.create");
  await ensurePaymentIndexes();

  const parsed = parseWithSchema(paymentInputSchema, rawInput);
  if (!parsed.ok) {
    throw parsed.error;
  }

  const input = parsed.data;

  const invoice = await findInvoiceInWorkspace({
    workspaceId: session.workspace.id,
    invoiceId: input.invoiceId,
  });

  if (!invoice) {
    throw new AppError({
      code: "NOT_FOUND",
      message: "Invoice not found in workspace",
      userMessage: "Invoice not found.",
      details: { fieldErrors: { invoiceId: ["Invoice not found"] } },
    });
  }

  const invoiceId = invoice._id.toHexString();
  const { amountPaid } = await sumPaymentsForInvoiceInWorkspace({
    workspaceId: session.workspace.id,
    invoiceId,
  });

  const remaining = remainingBalance(invoice.total, amountPaid);

  if (remaining <= 0) {
    throw new AppError({
      code: "VALIDATION_ERROR",
      message: "Invoice already fully paid",
      userMessage: "This invoice is already fully paid.",
      details: { fieldErrors: { amount: ["Invoice is already fully paid"] } },
    });
  }

  const amountCents = moneyToCents(input.amount);
  const remainingCents = moneyToCents(remaining);

  if (amountCents > remainingCents) {
    throw new AppError({
      code: "VALIDATION_ERROR",
      message: "Payment exceeds remaining balance",
      userMessage: "Payment amount cannot exceed the remaining invoice balance.",
      details: {
        fieldErrors: {
          amount: ["Amount exceeds the remaining balance"],
        },
      },
    });
  }

  const created = await insertPayment({
    workspaceId: session.workspace.id,
    createdByUserId: session.user.id,
    invoiceId,
    invoiceNumberSnapshot: invoice.invoiceNumber,
    customerId: invoice.customerId,
    customerNameSnapshot: invoice.customerNameSnapshot,
    amount: input.amount,
    currency: invoice.currency,
    paymentDate: input.paymentDate,
    method: input.method,
    reference: input.reference,
    notes: input.notes,
  });

  // Re-check after insert to reduce concurrent overpayment races.
  const after = await sumPaymentsForInvoiceInWorkspace({
    workspaceId: session.workspace.id,
    invoiceId,
  });
  const afterRemaining = remainingBalance(invoice.total, after.amountPaid);

  if (afterRemaining < 0) {
    await deletePaymentInWorkspace({
      workspaceId: session.workspace.id,
      paymentId: created._id.toHexString(),
    });
    throw new AppError({
      code: "CONFLICT",
      message: "Concurrent payment exceeded remaining balance",
      userMessage:
        "Another payment was recorded at the same time. The remaining balance is no longer enough for this amount.",
      details: {
        fieldErrors: {
          amount: ["Amount exceeds the remaining balance"],
        },
      },
    });
  }

  if (afterRemaining === 0 && invoice.status !== "paid") {
    await updateInvoiceStatusInWorkspace({
      workspaceId: session.workspace.id,
      invoiceId,
      status: "paid",
    });
  }

  await emitPaymentReceived(created);

  return toPaymentDTO(created);
}
