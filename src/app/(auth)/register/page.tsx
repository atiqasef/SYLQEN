import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";
import {
  isEmailDeliveryConfigured,
  isGoogleOAuthConfigured,
  isProductionRuntime,
} from "@/config/env";
import { redirectIfAuthenticated } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Create account",
};

export default async function RegisterPage() {
  await redirectIfAuthenticated();

  const emailReady = isEmailDeliveryConfigured();
  const production = isProductionRuntime();

  return (
    <AuthShell
      title="Create your SYLQEN account"
      description="Register with any legitimate email provider. Ownership is confirmed through verification."
    >
      {!emailReady && production ? (
        <p
          role="status"
          className="mb-4 rounded-[var(--radius-md)] border border-border bg-muted/40 px-4 py-3 text-sm leading-6 text-muted-foreground"
        >
          Registration email delivery is not configured yet. Add{" "}
          <code className="text-xs">EMAIL_PROVIDER=resend</code>,{" "}
          <code className="text-xs">RESEND_API_KEY</code>, and{" "}
          <code className="text-xs">EMAIL_FROM</code> in Vercel Production
          before creating accounts.
        </p>
      ) : null}
      <RegisterForm
        googleEnabled={isGoogleOAuthConfigured()}
        emailDeliveryConfigured={emailReady}
      />
    </AuthShell>
  );
}
