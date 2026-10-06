/**
 * Better Auth runs verification/reset email as a background task and swallows
 * delivery failures after returning HTTP 200. Email-dependent routes must be
 * gated before the Better Auth handler runs in production.
 */
export function requiresOutboundEmail(pathname: string): boolean {
  return (
    pathname.endsWith("/sign-up/email") ||
    pathname.endsWith("/send-verification-email") ||
    pathname.endsWith("/forget-password") ||
    pathname.endsWith("/request-password-reset")
  );
}
