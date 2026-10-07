"use client";

import { ErrorState } from "@/components/feedback/error-state";

export default function AutomationsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="Automations failed to load"
      description="A recoverable error occurred while loading automations. Your data was not exposed."
      reset={reset}
    />
  );
}
