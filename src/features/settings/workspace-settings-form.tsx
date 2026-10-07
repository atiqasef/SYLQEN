"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { AuthAlert, AuthStatus } from "@/components/auth/auth-form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateWorkspaceSettingsAction } from "@/server/settings/actions";

type WorkspaceSettingsFormProps = {
  initialName: string;
  slug: string;
  readOnly?: boolean;
  readOnlyMessage?: string;
};

type FieldErrors = Record<string, string[] | undefined>;

function fieldError(fieldErrors: FieldErrors | undefined, key: string) {
  return fieldErrors?.[key]?.[0];
}

export function WorkspaceSettingsForm({
  initialName,
  slug,
  readOnly = false,
  readOnlyMessage,
}: WorkspaceSettingsFormProps) {
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

    const result = await updateWorkspaceSettingsAction({ name });
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      setFieldErrors(result.fieldErrors);
      return;
    }

    setSuccess("Workspace name saved.");
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
        <Label htmlFor="workspace-name">
          Workspace name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="workspace-name"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={disabled}
          autoComplete="organization"
          aria-invalid={Boolean(nameError)}
          aria-describedby={
            nameError ? "workspace-name-error" : "workspace-name-hint"
          }
        />
        {nameError ? (
          <p id="workspace-name-error" className="text-xs text-destructive" role="alert">
            {nameError}
          </p>
        ) : (
          <p id="workspace-name-hint" className="text-xs leading-5 text-muted-foreground">
            Shown in the app shell and across workspace pages.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="workspace-slug">Workspace slug</Label>
        <Input
          id="workspace-slug"
          name="slug"
          value={slug}
          readOnly
          disabled
          aria-describedby="workspace-slug-hint"
        />
        <p id="workspace-slug-hint" className="text-xs leading-5 text-muted-foreground">
          Stable workspace identifier. Not editable.
        </p>
      </div>

      {!readOnly ? (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button type="submit" disabled={disabled}>
            {pending ? "Saving…" : "Save workspace"}
          </Button>
        </div>
      ) : null}
    </form>
  );
}
