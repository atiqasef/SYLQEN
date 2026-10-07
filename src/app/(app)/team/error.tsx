"use client";

import { ErrorState } from "@/components/feedback/error-state";

export default function TeamError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="Team failed to load"
      description="A recoverable error occurred while loading team members. Your data was not exposed."
      reset={reset}
    />
  );
}
