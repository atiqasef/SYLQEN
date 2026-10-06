"use client";

import { ErrorState } from "@/components/feedback/error-state";

export default function CustomersError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="Customers failed to load"
      description="A recoverable error occurred while loading customers. Your data was not exposed."
      reset={reset}
    />
  );
}
