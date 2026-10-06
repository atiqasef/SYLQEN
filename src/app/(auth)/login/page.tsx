import { Suspense } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { Skeleton } from "@/components/ui/skeleton";
import { isDemoConfigured, isGoogleOAuthConfigured } from "@/config/env";
import { redirectIfAuthenticated } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sign in",
};

export default async function LoginPage() {
  await redirectIfAuthenticated();

  return (
    <AuthShell
      title="Sign in to SYLQEN"
      description="Access your workspace with a verified email, Google, or the read-only demo."
    >
      <Suspense fallback={<Skeleton className="h-72 w-full" />}>
        <LoginForm
          googleEnabled={isGoogleOAuthConfigured()}
          demoEnabled={isDemoConfigured()}
        />
      </Suspense>
    </AuthShell>
  );
}
