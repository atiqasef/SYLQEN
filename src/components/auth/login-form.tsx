"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { GoogleButton } from "@/components/auth/google-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { authClient } from "@/lib/auth-client";
import { getSafeNextPath } from "@/lib/navigation/safe-next-path";
import { exploreDemoAction } from "@/server/auth/actions";

type LoginFormProps = {
  googleEnabled: boolean;
  demoEnabled: boolean;
};

export function LoginForm({ googleEnabled, demoEnabled }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [demoPending, setDemoPending] = React.useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const nextPath = getSafeNextPath(searchParams.get("next"));

    const result = await authClient.signIn.email({
      email,
      password,
      callbackURL: nextPath,
    });

    setPending(false);

    if (result.error) {
      setError(result.error.message || "Invalid email or password.");
      return;
    }

    router.push(nextPath);
    router.refresh();
  }

  async function onDemo() {
    setDemoPending(true);
    setError(null);
    const result = await exploreDemoAction();
    setDemoPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <GoogleButton enabled={googleEnabled} />

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        <span>or continue with email</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form className="space-y-4" onSubmit={onSubmit} noValidate>
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
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
          />
        </div>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Signing in…" : "Continue with email"}
        </Button>
      </form>

      <div className="space-y-3 border-t border-border pt-5">
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          disabled={!demoEnabled || demoPending}
          onClick={onDemo}
        >
          {demoPending ? "Opening demo…" : "Explore Demo"}
        </Button>
        <p className="text-center text-xs leading-5 text-muted-foreground">
          Demo access is read-only and clearly marked.{" "}
          {demoEnabled
            ? "No personal data is used."
            : "Configure DEMO_EMAIL and DEMO_PASSWORD to enable."}
        </p>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        New to SYLQEN?{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
