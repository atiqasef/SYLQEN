import { Suspense } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { VerifyEmailPanel } from "@/components/auth/verify-email-panel";
import { Skeleton } from "@/components/ui/skeleton";
import {
  isEmailDeliveryConfigured,
  isProductionRuntime,
} from "@/config/env";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Verify email",
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const params = await searchParams;
  const emailReady = isEmailDeliveryConfigured();
  const production = isProductionRuntime();

  return (
    <AuthShell
      title="Verify your email"
      description="Please verify your email address before continuing into SYLQEN."
    >
      {!emailReady && production ? (
        <p
          role="status"
          className="mb-4 rounded-[var(--radius-md)] border border-border bg-muted/40 px-4 py-3 text-sm leading-6 text-muted-foreground"
        >
          Verification emails cannot be delivered until Production email is
          configured. Set <code className="text-xs">EMAIL_PROVIDER=resend</code>
          , <code className="text-xs">RESEND_API_KEY</code>, and{" "}
          <code className="text-xs">EMAIL_FROM</code> in Vercel, then resend.
        </p>
      ) : null}
      <Suspense fallback={<Skeleton className="h-56 w-full" />}>
        <VerifyEmailPanel
          initialEmail={params.email}
          emailDeliveryConfigured={emailReady}
        />
      </Suspense>
    </AuthShell>
  );
}
