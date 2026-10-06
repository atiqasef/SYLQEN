import "server-only";

import { AppError } from "@/lib/errors/app-error";

import type { SessionContext } from "./types";

/**
 * Future entry point for reading the authenticated session.
 * Phase 1 has no auth provider — callers must not invent identity.
 */
export async function getSession(): Promise<SessionContext | null> {
  return null;
}

/**
 * Require an authenticated session. Throws UNAUTHORIZED when absent.
 * Use this in future server actions / route handlers.
 */
export async function requireSession(): Promise<SessionContext> {
  const session = await getSession();

  if (!session) {
    throw new AppError({
      code: "UNAUTHORIZED",
      message: "Authentication required",
      userMessage: "Please sign in to continue.",
    });
  }

  return session;
}

/**
 * Derive trusted workspace identity from the session — never from request body.
 */
export async function requireWorkspaceContext(): Promise<SessionContext> {
  return requireSession();
}
