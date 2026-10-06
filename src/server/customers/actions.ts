"use server";

import { revalidatePath } from "next/cache";

import { isAppError, toAppError } from "@/lib/errors/app-error";
import { requireSession } from "@/server/auth/session";
import {
  createCustomerForSession,
  updateCustomerForSession,
} from "@/server/customers/service";
import { logger } from "@/server/logging/logger";

export type CustomerActionResult =
  | { ok: true; id: string }
  | {
      ok: false;
      error: string;
      code?: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };

function mapActionError(error: unknown): CustomerActionResult {
  const appError = toAppError(error);
  if (!isAppError(error)) {
    logger.error("Customer action failed", {
      code: appError.code,
      message: appError.message,
    });
  }

  return {
    ok: false,
    error: appError.userMessage,
    code: appError.code,
    fieldErrors:
      appError.details &&
      typeof appError.details === "object" &&
      "fieldErrors" in appError.details
        ? (appError.details.fieldErrors as Record<string, string[] | undefined>)
        : undefined,
  };
}

export async function createCustomerAction(
  input: unknown,
): Promise<CustomerActionResult> {
  try {
    const session = await requireSession();
    const created = await createCustomerForSession(session, input);
    revalidatePath("/customers");
    return { ok: true, id: created.id };
  } catch (error) {
    return mapActionError(error);
  }
}

export async function updateCustomerAction(
  customerId: string,
  input: unknown,
): Promise<CustomerActionResult> {
  try {
    const session = await requireSession();
    const updated = await updateCustomerForSession(session, customerId, input);
    revalidatePath("/customers");
    revalidatePath(`/customers/${updated.id}`);
    return { ok: true, id: updated.id };
  } catch (error) {
    return mapActionError(error);
  }
}
