"use client";

import { ErrorState } from "@/components/feedback/error-state";

export default function ProductsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="Products failed to load"
      description="A recoverable error occurred while loading products. Your data was not exposed."
      reset={reset}
    />
  );
}
