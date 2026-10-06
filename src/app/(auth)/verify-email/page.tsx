import { Suspense } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { VerifyEmailPanel } from "@/components/auth/verify-email-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { isEmailDeliveryConfigured } from "@/config/env";

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

  return (
    <AuthShell
      title="Verify your email"
      description="Email verification is optional in the current portfolio stage and does not block access."
    >
      <p
        role="status"
        className="mb-4 rounded-[var(--radius-md)] border border-border bg-muted/40 px-4 py-3 text-sm leading-6 text-muted-foreground"
      >
        You can continue using SYLQEN without verifying. This page remains for
        future production email verification once Resend is configured.
      </p>
      <Suspense fallback={<Skeleton className="h-56 w-full" />}>
        <VerifyEmailPanel
          initialEmail={params.email}
          emailDeliveryConfigured={emailReady}
        />
      </Suspense>
    </AuthShell>
  );
}
