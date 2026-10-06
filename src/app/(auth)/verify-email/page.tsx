import { Suspense } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { VerifyEmailPanel } from "@/components/auth/verify-email-panel";
import { Skeleton } from "@/components/ui/skeleton";

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

  return (
    <AuthShell
      title="Verify your email"
      description="Please verify your email address before continuing into SYLQEN."
    >
      <Suspense fallback={<Skeleton className="h-56 w-full" />}>
        <VerifyEmailPanel initialEmail={params.email} />
      </Suspense>
    </AuthShell>
  );
}
