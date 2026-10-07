"use client";

import { ErrorState } from "@/components/feedback/error-state";

export default function SettingsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="Settings failed to load"
      description="A recoverable error occurred while loading settings. Your data was not exposed."
      reset={reset}
    />
  );
}
