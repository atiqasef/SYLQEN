import "server-only";

import { AppError } from "@/lib/errors/app-error";
import { parseWithSchema } from "@/lib/validation/result";
import {
  calculateLineTotal,
  sumMoney,
} from "@/features/invoices/money";
import {
  invoiceInputSchema,
  invoiceListQuerySchema,
  type InvoiceInput,
} from "@/features/invoices/schemas";
import { findCustomerInWorkspace } from "@/server/customers/repository";
import {
  allocateInvoiceNumber,
  ensureInvoiceIndexes,
  findInvoiceInWorkspace,
  insertInvoice,
  listInvoicesInWorkspace,
  toInvoiceDTO,
  updateInvoiceInWorkspace,
} from "@/server/invoices/repository";
import type {
  InvoiceDTO,
  InvoiceLineItemDocument,
  InvoiceListResult,
} from "@/server/invoices/types";
import { findProductsByIdsInWorkspace } from "@/server/products/repository";
import type { SessionContext } from "@/server/auth/types";
import { emitInvoiceOverdueIfNeeded } from "@/server/automations/events";

function assertPermission(
  session: SessionContext,
  permission: SessionContext["membership"]["permissions"][number],
) {
  if (!session.membership.permissions.includes(permission)) {
    throw new AppError({
      code: "FORBIDDEN",
      message: `Missing permission: ${permission}`,
      userMessage: session.user.isDemo
        ? "Demo accounts are read-only. Invoice changes are disabled."
        : "You do not have permission to perform this action.",
    });
  }
}

async function buildLineItemsFromInput(options: {
  workspaceId: string;
  lineItems: InvoiceInput["lineItems"];
  expectedCurrency: string;
}): Promise<{
  lineItems: InvoiceLineItemDocument[];
  currency: string;
  subtotal: number;
  total: number;
}> {
  const productIds = options.lineItems.map((item) => item.productId);
  const products = await findProductsByIdsInWorkspace({
    workspaceId: options.workspaceId,
    productIds,
  });
  const productById = new Map(
    products.map((product) => [product._id.toHexString(), product]),
  );

  const lineItems: InvoiceLineItemDocument[] = [];

  for (const [index, item] of options.lineItems.entries()) {
    const product = productById.get(item.productId);
    if (!product) {
      throw new AppError({
        code: "NOT_FOUND",
        message: `Product not found for line item ${index}`,
        userMessage: "One or more selected products were not found.",
        details: { fieldErrors: { [`lineItems.${index}.productId`]: ["Product not found"] } },
      });
    }

    if (product.currency !== options.expectedCurrency) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Mixed product currencies on invoice",
        userMessage:
          "All invoice line items must use products with the same currency.",
        details: {
          fieldErrors: {
            currency: ["Currency must match all selected products"],
          },
        },
      });
    }

    const unitPrice = product.price;
    const lineTotal = calculateLineTotal(item.quantity, unitPrice);

    lineItems.push({
      productId: product._id.toHexString(),
      productNameSnapshot: product.name,
      skuSnapshot: product.sku,
      quantity: item.quantity,
      unitPrice,
      lineTotal,
    });
  }

  const subtotal = sumMoney(lineItems.map((item) => item.lineTotal));
  return {
    lineItems,
    currency: options.expectedCurrency,
    subtotal,
    total: subtotal,
  };
}

async function resolveInvoicePayload(
  session: SessionContext,
  input: InvoiceInput,
) {
  const customer = await findCustomerInWorkspace({
    workspaceId: session.workspace.id,
    customerId: input.customerId,
  });

  if (!customer) {
    throw new AppError({
      code: "NOT_FOUND",
      message: "Customer not found in workspace",
      userMessage: "Customer not found.",
      details: { fieldErrors: { customerId: ["Customer not found"] } },
    });
  }

  const built = await buildLineItemsFromInput({
    workspaceId: session.workspace.id,
    lineItems: input.lineItems,
    expectedCurrency: input.currency,
  });

  return {
    customerId: customer._id.toHexString(),
    customerNameSnapshot: customer.name,
    status: input.status,
    issueDate: input.issueDate,
    dueDate: input.dueDate,
    currency: built.currency,
    notes: input.notes,
    lineItems: built.lineItems,
    subtotal: built.subtotal,
    total: built.total,
  };
}

export async function listInvoicesForSession(
  session: SessionContext,
  rawQuery: unknown,
): Promise<InvoiceListResult> {
  assertPermission(session, "invoices.read");
  await ensureInvoiceIndexes();

  const parsed = parseWithSchema(invoiceListQuerySchema, rawQuery);
  if (!parsed.ok) {
    throw parsed.error;
  }

  const { q, page, pageSize } = parsed.data;
  const { items, total } = await listInvoicesInWorkspace({
    workspaceId: session.workspace.id,
    q,
    page,
    pageSize,
  });

  const pageCount = total === 0 ? 0 : Math.ceil(total / pageSize);

  return {
    items: items.map(toInvoiceDTO),
    total,
    page,
    pageSize,
    pageCount,
  };
}

export async function getInvoiceForSession(
  session: SessionContext,
  invoiceId: string,
): Promise<InvoiceDTO> {
  assertPermission(session, "invoices.read");
  await ensureInvoiceIndexes();

  const doc = await findInvoiceInWorkspace({
    workspaceId: session.workspace.id,
    invoiceId,
  });

  if (!doc) {
    throw new AppError({
      code: "NOT_FOUND",
      message: "Invoice not found in workspace",
      userMessage: "Invoice not found.",
    });
  }

  return toInvoiceDTO(doc);
}

export async function createInvoiceForSession(
  session: SessionContext,
  rawInput: unknown,
): Promise<InvoiceDTO> {
  assertPermission(session, "invoices.create");
  await ensureInvoiceIndexes();

  const parsed = parseWithSchema(invoiceInputSchema, rawInput);
  if (!parsed.ok) {
    throw parsed.error;
  }

  const payload = await resolveInvoicePayload(session, parsed.data);
  const invoiceNumber = await allocateInvoiceNumber(session.workspace.id);

  try {
    const created = await insertInvoice({
      workspaceId: session.workspace.id,
      createdByUserId: session.user.id,
      invoiceNumber,
      ...payload,
    });

    await emitInvoiceOverdueIfNeeded(created);

    return toInvoiceDTO(created);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: number }).code === 11000
    ) {
      throw new AppError({
        code: "CONFLICT",
        message: "Invoice number unique index conflict",
        userMessage: "Could not allocate a unique invoice number. Please try again.",
      });
    }
    throw error;
  }
}

export async function updateInvoiceForSession(
  session: SessionContext,
  invoiceId: string,
  rawInput: unknown,
): Promise<InvoiceDTO> {
  assertPermission(session, "invoices.update");
  await ensureInvoiceIndexes();

  const parsed = parseWithSchema(invoiceInputSchema, rawInput);
  if (!parsed.ok) {
    throw parsed.error;
  }

  const existing = await findInvoiceInWorkspace({
    workspaceId: session.workspace.id,
    invoiceId,
  });

  if (!existing) {
    throw new AppError({
      code: "NOT_FOUND",
      message: "Invoice not found in workspace",
      userMessage: "Invoice not found.",
    });
  }

  const payload = await resolveInvoicePayload(session, parsed.data);

  const updated = await updateInvoiceInWorkspace({
    workspaceId: session.workspace.id,
    invoiceId,
    patch: payload,
  });

  if (!updated) {
    throw new AppError({
      code: "NOT_FOUND",
      message: "Invoice not found during update",
      userMessage: "Invoice not found.",
    });
  }

  await emitInvoiceOverdueIfNeeded(updated);

  return toInvoiceDTO(updated);
}
