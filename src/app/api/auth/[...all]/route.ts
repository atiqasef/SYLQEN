import { toNextJsHandler } from "better-auth/next-js";

import {
  getAppBaseUrl,
  isEmailDeliveryConfigured,
  isProductionRuntime,
} from "@/config/env";
import { isAppError } from "@/lib/errors/app-error";
import { getAuth } from "@/lib/auth";
import { requiresOutboundEmail } from "@/server/auth/email-routes";
import { connectMongo, isMongoConfigured } from "@/server/db/mongodb";
import { getEmailDeliveryDiagnostics } from "@/server/email";
import { logger } from "@/server/logging/logger";

function authDiagnostics(request: Request) {
  const email = getEmailDeliveryDiagnostics();
  let originHost: string | null = null;
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      originHost = new URL(origin).host;
    } catch {
      originHost = "invalid-origin";
    }
  }

  let baseHost: string | null = null;
  try {
    baseHost = new URL(getAppBaseUrl()).host;
  } catch {
    baseHost = "invalid-base-url";
  }

  return {
    mongoConfigured: isMongoConfigured(),
    emailProvider: email.provider,
    emailDeliveryConfigured: isEmailDeliveryConfigured(),
    productionRuntime: email.productionRuntime,
    originHost,
    baseHost,
  };
}

function jsonError(error: unknown, status = 500) {
  if (isAppError(error)) {
    return Response.json(
      {
        message: error.userMessage,
        code: error.code,
      },
      { status: error.status },
    );
  }

  const message =
    error instanceof Error && error.message
      ? "Authentication request failed."
      : "Authentication request failed.";

  return Response.json(
    {
      message,
      code: "INTERNAL_ERROR",
    },
    { status },
  );
}

async function ensureDb() {
  await connectMongo();
}

export async function GET(request: Request) {
  try {
    await ensureDb();
    const handlers = toNextJsHandler(getAuth());
    return handlers.GET(request);
  } catch (error) {
    logger.error("Auth API GET failed", {
      ...authDiagnostics(request),
      errorName: error instanceof Error ? error.name : "unknown",
      errorMessage: error instanceof Error ? error.message : "unknown",
      errorCode: isAppError(error) ? error.code : undefined,
    });
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  const path = new URL(request.url).pathname;

  if (
    requiresOutboundEmail(path) &&
    isProductionRuntime() &&
    !isEmailDeliveryConfigured()
  ) {
    logger.error("Auth API POST rejected: production email not configured", {
      path,
      ...authDiagnostics(request),
    });
    return Response.json(
      {
        message:
          "Email delivery is not configured. Set EMAIL_PROVIDER=resend, RESEND_API_KEY, and EMAIL_FROM in Vercel Production.",
        code: "EMAIL_NOT_CONFIGURED",
      },
      { status: 503 },
    );
  }

  try {
    await ensureDb();
    const handlers = toNextJsHandler(getAuth());
    return await handlers.POST(request);
  } catch (error) {
    logger.error("Auth API POST failed", {
      path,
      ...authDiagnostics(request),
      errorName: error instanceof Error ? error.name : "unknown",
      errorMessage: error instanceof Error ? error.message : "unknown",
      errorCode: isAppError(error) ? error.code : undefined,
    });
    return jsonError(error);
  }
}
