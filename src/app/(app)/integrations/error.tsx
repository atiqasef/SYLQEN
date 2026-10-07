"use client";

import { ErrorState } from "@/components/feedback/error-state";

export default function IntegrationsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="Integrations failed to load"
      description="A recoverable error occurred while loading integrations. Your data was not exposed."
      reset={reset}
    />
  );
}
