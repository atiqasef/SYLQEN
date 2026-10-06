import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { isGoogleOAuthConfigured } from "@/config/env";
import { redirectIfAuthenticated } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Create account",
};

export default async function RegisterPage() {
  await redirectIfAuthenticated();

  return (
    <AuthShell
      title="Create your SYLQEN account"
      description="Register with email and password to start using your workspace."
    >
      <RegisterForm googleEnabled={isGoogleOAuthConfigured()} />
    </AuthShell>
  );
}
