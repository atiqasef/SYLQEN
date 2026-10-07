import "server-only";

import { AppError } from "@/lib/errors/app-error";
import { parseWithSchema } from "@/lib/validation/result";
import {
  customerInputSchema,
  customerListQuerySchema,
  type CustomerInput,
} from "@/features/customers/schemas";
import {
  ensureCustomerIndexes,
  findCustomerByEmailInWorkspace,
  findCustomerInWorkspace,
  insertCustomer,
  listCustomersInWorkspace,
  toCustomerDTO,
  updateCustomerInWorkspace,
} from "@/server/customers/repository";
import type {
  CustomerDTO,
  CustomerListResult,
} from "@/server/customers/types";
import type { SessionContext } from "@/server/auth/types";
import { emitCustomerCreated } from "@/server/automations/events";

function assertPermission(
  session: SessionContext,
  permission: SessionContext["membership"]["permissions"][number],
) {
  if (!session.membership.permissions.includes(permission)) {
    throw new AppError({
      code: "FORBIDDEN",
      message: `Missing permission: ${permission}`,
      userMessage: session.user.isDemo
        ? "Demo accounts are read-only. Customer changes are disabled."
        : "You do not have permission to perform this action.",
    });
  }
}

export async function listCustomersForSession(
  session: SessionContext,
  rawQuery: unknown,
): Promise<CustomerListResult> {
  assertPermission(session, "customers.read");
  await ensureCustomerIndexes();

  const parsed = parseWithSchema(customerListQuerySchema, rawQuery);
  if (!parsed.ok) {
    throw parsed.error;
  }

  const { q, page, pageSize } = parsed.data;
  const { items, total } = await listCustomersInWorkspace({
    workspaceId: session.workspace.id,
    q,
    page,
    pageSize,
  });

  const pageCount = total === 0 ? 0 : Math.ceil(total / pageSize);

  return {
    items: items.map(toCustomerDTO),
    total,
    page,
    pageSize,
    pageCount,
  };
}

export async function getCustomerForSession(
  session: SessionContext,
  customerId: string,
): Promise<CustomerDTO> {
  assertPermission(session, "customers.read");
  await ensureCustomerIndexes();

  const doc = await findCustomerInWorkspace({
    workspaceId: session.workspace.id,
    customerId,
  });

  if (!doc) {
    throw new AppError({
      code: "NOT_FOUND",
      message: "Customer not found in workspace",
      userMessage: "Customer not found.",
    });
  }

  return toCustomerDTO(doc);
}

export async function createCustomerForSession(
  session: SessionContext,
  rawInput: unknown,
): Promise<CustomerDTO> {
  assertPermission(session, "customers.create");
  await ensureCustomerIndexes();

  const parsed = parseWithSchema(customerInputSchema, rawInput);
  if (!parsed.ok) {
    throw parsed.error;
  }

  const input = parsed.data;
  const existing = await findCustomerByEmailInWorkspace({
    workspaceId: session.workspace.id,
    email: input.email,
  });

  if (existing) {
    throw new AppError({
      code: "CONFLICT",
      message: "Customer email already exists in workspace",
      userMessage: "A customer with this email already exists in your workspace.",
    });
  }

  const created = await insertCustomer({
    workspaceId: session.workspace.id,
    createdByUserId: session.user.id,
    ...input,
  });

  await emitCustomerCreated(created);

  return toCustomerDTO(created);
}

export async function updateCustomerForSession(
  session: SessionContext,
  customerId: string,
  rawInput: unknown,
): Promise<CustomerDTO> {
  assertPermission(session, "customers.update");
  await ensureCustomerIndexes();

  const parsed = parseWithSchema(customerInputSchema, rawInput);
  if (!parsed.ok) {
    throw parsed.error;
  }

  const input: CustomerInput = parsed.data;

  const existing = await findCustomerInWorkspace({
    workspaceId: session.workspace.id,
    customerId,
  });

  if (!existing) {
    throw new AppError({
      code: "NOT_FOUND",
      message: "Customer not found in workspace",
      userMessage: "Customer not found.",
    });
  }

  const emailConflict = await findCustomerByEmailInWorkspace({
    workspaceId: session.workspace.id,
    email: input.email,
    excludeCustomerId: customerId,
  });

  if (emailConflict) {
    throw new AppError({
      code: "CONFLICT",
      message: "Customer email already exists in workspace",
      userMessage: "A customer with this email already exists in your workspace.",
    });
  }

  const updated = await updateCustomerInWorkspace({
    workspaceId: session.workspace.id,
    customerId,
    patch: input,
  });

  if (!updated) {
    throw new AppError({
      code: "NOT_FOUND",
      message: "Customer not found during update",
      userMessage: "Customer not found.",
    });
  }

  return toCustomerDTO(updated);
}
