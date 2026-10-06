"use server";

import { revalidatePath } from "next/cache";

import { isAppError, toAppError } from "@/lib/errors/app-error";
import { requireSession } from "@/server/auth/session";
import {
  createInvoiceForSession,
  updateInvoiceForSession,
} from "@/server/invoices/service";
import { logger } from "@/server/logging/logger";

export type InvoiceActionResult =
  | { ok: true; id: string }
  | {
      ok: false;
      error: string;
      code?: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };

function mapActionError(error: unknown): InvoiceActionResult {
  const appError = toAppError(error);
  if (!isAppError(error)) {
    logger.error("Invoice action failed", {
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

export async function createInvoiceAction(
  input: unknown,
): Promise<InvoiceActionResult> {
  try {
    const session = await requireSession();
    const created = await createInvoiceForSession(session, input);
    revalidatePath("/invoices");
    return { ok: true, id: created.id };
  } catch (error) {
    return mapActionError(error);
  }
}

export async function updateInvoiceAction(
  invoiceId: string,
  input: unknown,
): Promise<InvoiceActionResult> {
  try {
    const session = await requireSession();
    const updated = await updateInvoiceForSession(session, invoiceId, input);
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${updated.id}`);
    return { ok: true, id: updated.id };
  } catch (error) {
    return mapActionError(error);
  }
}
