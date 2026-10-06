"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { AuthAlert, AuthStatus } from "@/components/auth/auth-form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

type VerifyEmailPanelProps = {
  initialEmail?: string;
  emailDeliveryConfigured?: boolean;
};

function verificationErrorMessage(error: string | null): string | null {
  if (!error) {
    return null;
  }

  const normalized = error.toLowerCase();
  if (normalized.includes("expired")) {
    return "This verification link has expired. Request a new one below.";
  }
  if (normalized.includes("invalid")) {
    return "This verification link is invalid. Request a new one below.";
  }
  return "Email verification failed. Request a new link below.";
}

export function VerifyEmailPanel({
  initialEmail = "",
  emailDeliveryConfigured = true,
}: VerifyEmailPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromQuery = searchParams.get("email") || "";
  const [email, setEmail] = React.useState(initialEmail || emailFromQuery);
  const [error, setError] = React.useState<string | null>(
    verificationErrorMessage(searchParams.get("error")),
  );
  const [pending, setPending] = React.useState(false);
  const [resentStatus, setResentStatus] = React.useState<string | null>(null);

  async function onResend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setResentStatus(null);

    if (!emailDeliveryConfigured) {
      setPending(false);
      setError(
        "Email delivery is not configured. Set EMAIL_PROVIDER=resend, RESEND_API_KEY, and EMAIL_FROM in Vercel Production.",
      );
      return;
    }

    const result = await authClient.sendVerificationEmail({
      email,
      callbackURL: "/",
    });

    setPending(false);

    if (result.error) {
      const code =
        "code" in result.error && typeof result.error.code === "string"
          ? result.error.code
          : null;
      const details = [result.error.message, code ? `(${code})` : null]
        .filter(Boolean)
        .join(" ");
      setError(details || "Unable to resend verification email.");
      return;
    }

    setResentStatus("Verification email sent. Check your inbox and spam folder.");
  }

  return (
    <div className="space-y-5">
      <AuthStatus>
        {resentStatus ??
          "Verification is optional right now. You can continue using SYLQEN without verifying."}
      </AuthStatus>

      <form
        className="space-y-4"
        onSubmit={onResend}
        noValidate
        aria-busy={pending}
      >
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
            disabled={pending}
            aria-invalid={Boolean(error) || undefined}
          />
          {!emailDeliveryConfigured ? (
            <p className="text-xs leading-5 text-muted-foreground">
              Outbound email is not configured in this environment, so resend is
              unavailable.
            </p>
          ) : null}
        </div>

        {error ? <AuthAlert>{error}</AuthAlert> : null}

        <Button
          type="submit"
          className="w-full"
          disabled={pending || !email || !emailDeliveryConfigured}
        >
          {pending ? "Sending…" : "Resend verification email"}
        </Button>
      </form>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => router.push("/login")}
        >
          Back to sign in
        </Button>
        <Button asChild variant="ghost" className="w-full">
          <Link href="/register">Use a different email</Link>
        </Button>
      </div>
    </div>
  );
}
