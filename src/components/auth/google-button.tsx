"use client";

import * as React from "react";

import { AuthAlert } from "@/components/auth/auth-form-message";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.3-1.7 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.3 12 2.3 6.9 2.3 2.8 6.4 2.8 11.5S6.9 20.7 12 20.7c5.5 0 9.1-3.9 9.1-9.3 0-.6-.1-1.1-.2-1.6H12z"
      />
    </svg>
  );
}

const GOOGLE_AUTH_ERROR =
  "Unable to continue with Google. Please try again or use email instead.";

type GoogleButtonProps = {
  enabled: boolean;
  label?: string;
  /** Safe same-origin path for post-auth redirect (defaults to `/`). */
  callbackURL?: string;
  /** Extra disable from parent (email/demo pending). */
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
  onError?: (message: string) => void;
};

export function GoogleButton({
  enabled,
  label = "Continue with Google",
  callbackURL = "/",
  disabled = false,
  onBusyChange,
  onError,
}: GoogleButtonProps) {
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
        provider: "google",
        callbackURL,
      });

      if (result.error) {
        const message = GOOGLE_AUTH_ERROR;
        setLocalError(message);
        onError?.(message);
        setBusy(false);
      }
      // On success Better Auth navigates away; keep pending until unload.
    } catch {
      const message = GOOGLE_AUTH_ERROR;
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
        aria-label="Google sign-in not configured"
      >
        <GoogleMark />
        Google sign-in not configured
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
        <GoogleMark />
        {pending ? "Continuing with Google…" : label}
      </Button>
      {localError && !onError ? <AuthAlert>{localError}</AuthAlert> : null}
    </div>
  );
}
