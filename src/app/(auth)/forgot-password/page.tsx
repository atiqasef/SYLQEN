import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { redirectIfAuthenticated } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Forgot password",
};

export default async function ForgotPasswordPage() {
  await redirectIfAuthenticated();

  return (
    <AuthShell
      title="Reset your password"
      description="We will email a secure reset link if an account exists for that address."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
