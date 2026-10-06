"use client";

import { ErrorState } from "@/components/feedback/error-state";

export default function PaymentsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="Payments failed to load"
      description="A recoverable error occurred while loading payments. Your data was not exposed."
      reset={reset}
    />
  );
}
