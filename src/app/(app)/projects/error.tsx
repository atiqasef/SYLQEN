"use client";

import { ErrorState } from "@/components/feedback/error-state";

export default function ProjectsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="Projects failed to load"
      description="A recoverable error occurred while loading projects. Your data was not exposed."
      reset={reset}
    />
  );
}
