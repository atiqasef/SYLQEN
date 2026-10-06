"use server";

import { revalidatePath } from "next/cache";

import { isAppError, toAppError } from "@/lib/errors/app-error";
import { requireSession } from "@/server/auth/session";
import {
  createProductForSession,
  updateProductForSession,
} from "@/server/products/service";
import { logger } from "@/server/logging/logger";

export type ProductActionResult =
  | { ok: true; id: string }
  | {
      ok: false;
      error: string;
      code?: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };

function mapActionError(error: unknown): ProductActionResult {
  const appError = toAppError(error);
  if (!isAppError(error)) {
    logger.error("Product action failed", {
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

export async function createProductAction(
  input: unknown,
): Promise<ProductActionResult> {
  try {
    const session = await requireSession();
    const created = await createProductForSession(session, input);
    revalidatePath("/products");
    return { ok: true, id: created.id };
  } catch (error) {
    return mapActionError(error);
  }
}

export async function updateProductAction(
  productId: string,
  input: unknown,
): Promise<ProductActionResult> {
  try {
    const session = await requireSession();
    const updated = await updateProductForSession(session, productId, input);
    revalidatePath("/products");
    revalidatePath(`/products/${updated.id}`);
    return { ok: true, id: updated.id };
  } catch (error) {
    return mapActionError(error);
  }
}
