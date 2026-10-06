/**
 * Application error model for consistent server/client handling.
 * Never expose internal details or stack traces to end users.
 */

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "AI_DISABLED"
  | "AI_UNAVAILABLE"
  | "INTERNAL_ERROR";

export type AppErrorOptions = {
  code: ErrorCode;
  message: string;
  /** Safe, user-facing message. Prefer this over `message` in UI. */
  userMessage?: string;
  cause?: unknown;
  details?: Record<string, unknown>;
  status?: number;
};

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  AI_DISABLED: 503,
  AI_UNAVAILABLE: 503,
  INTERNAL_ERROR: 500,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly userMessage: string;
  readonly status: number;
  readonly details?: Record<string, unknown>;
  override readonly cause?: unknown;

  constructor(options: AppErrorOptions) {
    super(options.message, { cause: options.cause });
    this.name = "AppError";
    this.code = options.code;
    this.userMessage =
      options.userMessage ??
      "Something went wrong. Please try again or contact support.";
    this.status = options.status ?? STATUS_BY_CODE[options.code];
    this.details = options.details;
    this.cause = options.cause;
  }

  toJSON() {
    return {
      code: this.code,
      message: this.userMessage,
      status: this.status,
    };
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/** Convert unknown errors into a safe AppError for responses/UI. */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  return new AppError({
    code: "INTERNAL_ERROR",
    message: error instanceof Error ? error.message : "Unexpected error",
    userMessage: "An unexpected error occurred. Please try again.",
    cause: error,
  });
}
