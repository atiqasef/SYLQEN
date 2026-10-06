"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { AuthAlert } from "@/components/auth/auth-form-message";
import { GoogleButton } from "@/components/auth/google-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { authClient } from "@/lib/auth-client";

const PASSWORD_HINT =
  "Use at least 8 characters. Prefer a mix of letters, numbers, and symbols.";

type RegisterFormProps = {
  googleEnabled: boolean;
};

export function RegisterForm({ googleEnabled }: RegisterFormProps) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setPending(true);

    try {
      const result = await authClient.signUp.email({
        name,
        email,
        password,
        callbackURL: "/",
      });

      if (result.error) {
        const code =
          "code" in result.error && typeof result.error.code === "string"
            ? result.error.code
            : null;
        const details = [result.error.message, code ? `(${code})` : null]
          .filter(Boolean)
          .join(" ");
        setError(details || "Unable to create your account.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error && error.message
          ? error.message
          : "Unable to create your account.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-5">
      <GoogleButton enabled={googleEnabled} label="Continue with Google" />

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" aria-hidden="true" />
        <span>or continue with email</span>
        <div className="h-px flex-1 bg-border" aria-hidden="true" />
      </div>

      <form
        className="space-y-4"
        onSubmit={onSubmit}
        noValidate
        aria-busy={pending}
      >
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            autoComplete="name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ada Lovelace"
            disabled={pending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
            disabled={pending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Create a password"
            toggleLabelShow="Show password"
            toggleLabelHide="Hide password"
            disabled={pending}
            aria-describedby="password-hint"
            aria-invalid={
              error?.toLowerCase().includes("password") || undefined
            }
          />
          <p
            id="password-hint"
            className="text-xs leading-5 text-muted-foreground"
          >
            {PASSWORD_HINT}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Repeat your password"
            toggleLabelShow="Show confirm password"
            toggleLabelHide="Hide confirm password"
            disabled={pending}
            aria-invalid={
              error?.toLowerCase().includes("match") || undefined
            }
          />
        </div>

        {error ? <AuthAlert>{error}</AuthAlert> : null}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-primary underline-offset-4 transition-ui hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
