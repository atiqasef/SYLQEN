/**
 * Routes that require a real outbound email provider (Resend).
 * Sign-up/sign-in do not — portfolio stage has no mandatory verification.
 */
export function requiresOutboundEmail(pathname: string): boolean {
  return (
    pathname.endsWith("/send-verification-email") ||
    pathname.endsWith("/forget-password") ||
    pathname.endsWith("/request-password-reset")
  );
}
