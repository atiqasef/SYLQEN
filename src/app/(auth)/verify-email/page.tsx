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
      <Suspense fallback={<Skeleton className="h-56 w-full" />}>
        <VerifyEmailPanel
          initialEmail={params.email}
          emailDeliveryConfigured={emailReady}
        />
      </Suspense>
    </AuthShell>
  );
}
