import { ZodError, type ZodSchema } from "zod";

import { AppError } from "@/lib/errors/app-error";

export type Result<T, E = AppError> =
  | { ok: true; data: T }
  | { ok: false; error: E };

export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

export function err<E = AppError>(error: E): Result<never, E> {
  return { ok: false, error };
}

/**
 * Parse input with a Zod schema into a Result.
 * Validation failures become AppError with code VALIDATION_ERROR.
 */
export function parseWithSchema<T>(
  schema: ZodSchema<T>,
  input: unknown,
): Result<T> {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    return err(zodErrorToAppError(parsed.error));
  }

  return ok(parsed.data);
}

export function zodErrorToAppError(error: ZodError): AppError {
  const fieldErrors = error.flatten().fieldErrors;

  return new AppError({
    code: "VALIDATION_ERROR",
    message: "Validation failed",
    userMessage: "Please check the highlighted fields and try again.",
    details: { fieldErrors },
  });
}
