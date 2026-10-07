"use client";

import Link from "next/link";
import * as React from "react";
import { useRouter } from "next/navigation";

import { AuthAlert, AuthStatus } from "@/components/auth/auth-form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateAccountSettingsAction } from "@/server/settings/actions";

type AccountSettingsFormProps = {
  initialName: string;
  email: string;
  readOnly?: boolean;
  readOnlyMessage?: string;
};

type FieldErrors = Record<string, string[] | undefined>;

function fieldError(fieldErrors: FieldErrors | undefined, key: string) {
  return fieldErrors?.[key]?.[0];
}

export function AccountSettingsForm({
  initialName,
  email,
  readOnly = false,
  readOnlyMessage,
}: AccountSettingsFormProps) {
  const router = useRouter();
  const [name, setName] = React.useState(initialName);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>();
  const [pending, setPending] = React.useState(false);

  const disabled = pending || readOnly;
  const nameError = fieldError(fieldErrors, "name");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (readOnly) {
      return;
    }

    setPending(true);
    setError(null);
    setSuccess(null);
    setFieldErrors(undefined);

    const result = await updateAccountSettingsAction({ name });
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      setFieldErrors(result.fieldErrors);
      return;
    }

    setSuccess("Account name saved.");
    router.refresh();
  }

  return (
    <form
      className="space-y-4"
      onSubmit={onSubmit}
      noValidate
      aria-busy={pending}
    >
      {readOnly && readOnlyMessage ? (
        <AuthAlert>{readOnlyMessage}</AuthAlert>
      ) : null}
      {error ? <AuthAlert>{error}</AuthAlert> : null}
      {success ? <AuthStatus>{success}</AuthStatus> : null}

      <div className="space-y-2">
        <Label htmlFor="account-name">
          Display name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="account-name"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={disabled}
          autoComplete="name"
          aria-invalid={Boolean(nameError)}
          aria-describedby={
            nameError ? "account-name-error" : "account-name-hint"
          }
        />
        {nameError ? (
          <p id="account-name-error" className="text-xs text-destructive" role="alert">
            {nameError}
          </p>
        ) : (
          <p id="account-name-hint" className="text-xs leading-5 text-muted-foreground">
            Used in the account menu and team directory.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="account-email">Email</Label>
        <Input
          id="account-email"
          name="email"
          type="email"
          value={email}
          readOnly
          disabled
          aria-describedby="account-email-hint"
        />
        <p id="account-email-hint" className="text-xs leading-5 text-muted-foreground">
          Email is managed by authentication and cannot be changed here.
        </p>
      </div>

      {!readOnly ? (
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button type="submit" disabled={disabled}>
            {pending ? "Saving…" : "Save account"}
          </Button>
          <Button variant="outline" asChild>
            <Link href="/forgot-password">Reset password</Link>
          </Button>
        </div>
      ) : null}
    </form>
  );
}
