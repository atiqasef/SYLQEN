"use client";

import { ErrorState } from "@/components/feedback/error-state";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="This view failed to load"
      description="A recoverable error occurred while rendering this page. Your data was not exposed."
      reset={reset}
    />
  );
}
