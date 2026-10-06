import { Suspense } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { Skeleton } from "@/components/ui/skeleton";
import {
  isDemoConfigured,
  isEmailDeliveryConfigured,
  isGoogleOAuthConfigured,
  isProductionRuntime,
} from "@/config/env";
import { redirectIfAuthenticated } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sign in",
};

export default async function LoginPage() {
  await redirectIfAuthenticated();

  const emailReady = isEmailDeliveryConfigured();
  const production = isProductionRuntime();

  return (
    <AuthShell
      title="Sign in to SYLQEN"
      description="Access your workspace with a verified email, Google, or the read-only demo."
    >
      {!emailReady && production ? (
        <p
          role="status"
          className="mb-4 rounded-[var(--radius-md)] border border-border bg-muted/40 px-4 py-3 text-sm leading-6 text-muted-foreground"
        >
          Email delivery is not configured in Production. Set{" "}
          <code className="text-xs">EMAIL_PROVIDER=resend</code>,{" "}
          <code className="text-xs">RESEND_API_KEY</code>, and{" "}
          <code className="text-xs">EMAIL_FROM</code> in Vercel to enable
          verification emails.
        </p>
      ) : null}
      <Suspense fallback={<Skeleton className="h-72 w-full" />}>
        <LoginForm
          googleEnabled={isGoogleOAuthConfigured()}
          demoEnabled={isDemoConfigured()}
        />
      </Suspense>
    </AuthShell>
  );
}
