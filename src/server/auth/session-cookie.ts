import "server-only";

import { getSessionCookie } from "better-auth/cookies";

/**
 * Presence check for Better Auth's session cookie only.
 * A present cookie is NOT proof of a valid session — callers must still
 * verify via Better Auth when a cookie exists.
 */
export function hasBetterAuthSessionCookie(requestHeaders: Headers): boolean {
  return Boolean(getSessionCookie(requestHeaders));
}
