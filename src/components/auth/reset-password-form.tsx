"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { AuthAlert, AuthStatus } from "@/components/auth/auth-form-message";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { authClient } from "@/lib/auth-client";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const errorParam = searchParams.get("error");

  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(
    errorParam ? "This reset link is invalid or has expired." : null,
  );
  const [success, setSuccess] = React.useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError("Missing reset token. Request a new password reset link.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setPending(true);
    const result = await authClient.resetPassword({
      newPassword: password,
      token,
    });
    setPending(false);

    if (result.error) {
      setError(result.error.message || "Unable to reset password.");
      return;
    }

    setSuccess(true);
    window.setTimeout(() => router.push("/login"), 1200);
  }

  if (!token && !errorParam) {
    return (
      <div className="space-y-4">
        <AuthAlert>This reset link is incomplete. Request a new one.</AuthAlert>
        <Button asChild className="w-full">
          <Link href="/forgot-password">Request reset link</Link>
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          <Link
            href="/login"
            className="font-medium text-primary underline-offset-4 transition-ui hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={onSubmit}
      noValidate
      aria-busy={pending}
    >
      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <PasswordInput
          id="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Create a new password"
          toggleLabelShow="Show new password"
          toggleLabelHide="Hide new password"
          disabled={pending || success}
          aria-describedby="reset-password-hint"
          aria-invalid={
            error?.toLowerCase().includes("password") || undefined
          }
        />
        <p
          id="reset-password-hint"
          className="text-xs leading-5 text-muted-foreground"
        >
          Use at least 8 characters.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <PasswordInput
          id="confirmPassword"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Repeat your new password"
          toggleLabelShow="Show confirm password"
          toggleLabelHide="Hide confirm password"
          disabled={pending || success}
          aria-invalid={error?.toLowerCase().includes("match") || undefined}
        />
      </div>

      {error ? <AuthAlert>{error}</AuthAlert> : null}
      {success ? (
        <AuthStatus>Password updated. Redirecting to sign in…</AuthStatus>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending || success}>
        {pending ? "Updating…" : "Update password"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link
          href="/login"
          className="font-medium text-primary underline-offset-4 transition-ui hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
