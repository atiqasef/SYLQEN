"use client";

import { ErrorState } from "@/components/feedback/error-state";

export default function FinanceError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="Finance failed to load"
      description="A recoverable error occurred while loading financial data. Your data was not exposed."
      reset={reset}
    />
  );
}
