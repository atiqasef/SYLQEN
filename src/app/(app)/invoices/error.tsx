"use client";

import { ErrorState } from "@/components/feedback/error-state";

export default function InvoicesError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="Invoices failed to load"
      description="A recoverable error occurred while loading invoices. Your data was not exposed."
      reset={reset}
    />
  );
}
