"use server";

import { revalidatePath } from "next/cache";

import { isAppError, toAppError } from "@/lib/errors/app-error";
import { requireSession } from "@/server/auth/session";
import { createPaymentForSession } from "@/server/payments/service";
import { logger } from "@/server/logging/logger";

export type PaymentActionResult =
  | { ok: true; id: string }
  | {
      ok: false;
      error: string;
      code?: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };

function mapActionError(error: unknown): PaymentActionResult {
  const appError = toAppError(error);
  if (!isAppError(error)) {
    logger.error("Payment action failed", {
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

export async function createPaymentAction(
  input: unknown,
): Promise<PaymentActionResult> {
  try {
    const session = await requireSession();
    const created = await createPaymentForSession(session, input);
    revalidatePath("/payments");
    revalidatePath(`/payments/${created.id}`);
    revalidatePath(`/invoices/${created.invoiceId}`);
    revalidatePath("/invoices");
    return { ok: true, id: created.id };
  } catch (error) {
    return mapActionError(error);
  }
}
