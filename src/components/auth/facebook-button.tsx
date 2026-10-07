"use client";

import * as React from "react";

import { AuthAlert } from "@/components/auth/auth-form-message";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

function FacebookMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#1877F2"
        d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047v-2.66c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.265h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"
      />
    </svg>
  );
}

const FACEBOOK_AUTH_ERROR =
  "Unable to continue with Facebook. Please try again or use email instead.";

type FacebookButtonProps = {
  enabled: boolean;
  label?: string;
  /** Safe same-origin path for post-auth redirect (defaults to `/`). */
  callbackURL?: string;
  /** Extra disable from parent (email/demo/other social pending). */
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
  onError?: (message: string) => void;
};

export function FacebookButton({
  enabled,
  label = "Continue with Facebook",
  callbackURL = "/",
  disabled = false,
  onBusyChange,
  onError,
}: FacebookButtonProps) {
  const [pending, setPending] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);

  function setBusy(next: boolean) {
    setPending(next);
    onBusyChange?.(next);
  }

  async function onContinue() {
    if (!enabled || pending || disabled) {
      return;
    }

    setLocalError(null);
    setBusy(true);

    try {
      const result = await authClient.signIn.social({
        provider: "facebook",
        callbackURL,
      });

      if (result.error) {
        const message = FACEBOOK_AUTH_ERROR;
        setLocalError(message);
        onError?.(message);
        setBusy(false);
      }
      // On success Better Auth navigates away; keep pending until unload.
    } catch {
      const message = FACEBOOK_AUTH_ERROR;
      setLocalError(message);
      onError?.(message);
      setBusy(false);
    }
  }

  if (!enabled) {
    return (
      <Button
        type="button"
        variant="outline"
        className="w-full justify-center"
        disabled
        aria-disabled="true"
        aria-label="Facebook sign-in not configured"
      >
        <FacebookMark />
        Facebook sign-in not configured
      </Button>
    );
  }

  const isDisabled = disabled || pending;

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        className="w-full justify-center"
        disabled={isDisabled}
        aria-busy={pending || undefined}
        aria-label={label}
        onClick={onContinue}
      >
        <FacebookMark />
        {pending ? "Continuing with Facebook…" : label}
      </Button>
      {localError && !onError ? <AuthAlert>{localError}</AuthAlert> : null}
    </div>
  );
}
