import "server-only";

import { utcDateToDateOnly } from "@/features/invoices/schemas";
import { processAutomationEvent } from "@/server/automations/engine";
import type { AutomationEventContext } from "@/server/automations/types";
import type { CustomerDocument } from "@/server/customers/types";
import type { InvoiceDocument } from "@/server/invoices/types";
import type { PaymentDocument } from "@/server/payments/types";
import type { ProjectDocument } from "@/server/projects/types";
import type { ProjectStatus } from "@/features/projects/schemas";

/**
 * Lightweight emit helper. Domain services call this after successful mutations.
 * Never throws to the caller.
 */
export async function emitAutomationEvent(
  context: AutomationEventContext,
): Promise<void> {
  await processAutomationEvent(context);
}

export function isInvoiceOverdueAt(options: {
  status: InvoiceDocument["status"];
  dueDate: Date;
  todayStart: Date;
}): boolean {
  if (options.status === "draft" || options.status === "paid") {
    return false;
  }
  return (
    options.status === "overdue" ||
    options.dueDate.getTime() < options.todayStart.getTime()
  );
}

export function utcTodayStart(now: Date = new Date()): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

/** Idempotent key for a given due-date overdue evaluation (no cron in Phase 17). */
export function invoiceOverdueEventKey(
  invoiceId: string,
  dueDateOnly: string,
): string {
  return `invoice.overdue:${invoiceId}:${dueDateOnly}`;
}

export async function emitInvoiceOverdueIfNeeded(
  invoice: InvoiceDocument,
  now: Date = new Date(),
): Promise<void> {
  const todayStart = utcTodayStart(now);
  if (
    !isInvoiceOverdueAt({
      status: invoice.status,
      dueDate: invoice.dueDate,
      todayStart,
    })
  ) {
    return;
  }

  const dueDateOnly = utcDateToDateOnly(invoice.dueDate);
  const invoiceId = invoice._id.toHexString();

  await emitAutomationEvent({
    type: "invoice.overdue",
    workspaceId: invoice.workspaceId,
    eventKey: invoiceOverdueEventKey(invoiceId, dueDateOnly),
    occurredAt: now,
    invoice: {
      id: invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      currency: invoice.currency,
      total: invoice.total,
      dueDate: dueDateOnly,
      status: invoice.status,
    },
  });
}

export async function emitPaymentReceived(payment: PaymentDocument): Promise<void> {
  const paymentId = payment._id.toHexString();
  await emitAutomationEvent({
    type: "payment.received",
    workspaceId: payment.workspaceId,
    eventKey: `payment.received:${paymentId}`,
    occurredAt: payment.createdAt,
    payment: {
      id: paymentId,
      amount: payment.amount,
      currency: payment.currency,
      invoiceId: payment.invoiceId,
    },
  });
}

export async function emitCustomerCreated(
  customer: CustomerDocument,
): Promise<void> {
  const customerId = customer._id.toHexString();
  await emitAutomationEvent({
    type: "customer.created",
    workspaceId: customer.workspaceId,
    eventKey: `customer.created:${customerId}`,
    occurredAt: customer.createdAt,
    customer: {
      id: customerId,
      name: customer.name,
      email: customer.email,
      company: customer.company,
    },
  });
}

export async function emitProjectStatusChanged(options: {
  project: ProjectDocument;
  previousStatus: ProjectStatus;
}): Promise<void> {
  if (options.project.status === options.previousStatus) {
    return;
  }
  const projectId = options.project._id.toHexString();
  await emitAutomationEvent({
    type: "project.status_changed",
    workspaceId: options.project.workspaceId,
    eventKey: `project.status_changed:${projectId}:${options.previousStatus}->${options.project.status}:${options.project.updatedAt.toISOString()}`,
    occurredAt: options.project.updatedAt,
    project: {
      id: projectId,
      name: options.project.name,
      status: options.project.status,
      previousStatus: options.previousStatus,
    },
  });
}
