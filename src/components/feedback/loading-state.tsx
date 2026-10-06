import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";

type LoadingStateProps = {
  label?: string;
  className?: string;
};

/**
 * Layout-aligned loading shell for the authenticated overview.
 * Mirrors hero + foundation cards + detail columns to limit shift.
 */
export function LoadingState({
  label = "Loading",
  className,
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn("space-y-8 sm:space-y-10", className)}
    >
      <span className="sr-only">{label}</span>

      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
        <div className="max-w-2xl space-y-3">
          <Skeleton className="h-8 w-64 max-w-full sm:h-9 sm:w-80" />
          <Skeleton className="h-4 w-full max-w-xl" />
          <Skeleton className="h-4 w-full max-w-lg" />
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56 max-w-full" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-[8.5rem] w-full rounded-[var(--radius-lg)]" />
          <Skeleton className="h-[8.5rem] w-full rounded-[var(--radius-lg)]" />
          <Skeleton className="h-[8.5rem] w-full rounded-[var(--radius-lg)]" />
          <Skeleton className="h-[8.5rem] w-full rounded-[var(--radius-lg)]" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)]">
        <Skeleton className="h-72 w-full rounded-[var(--radius-lg)]" />
        <Skeleton className="h-72 w-full rounded-[var(--radius-lg)]" />
      </div>

      <Skeleton className="h-40 w-full rounded-[var(--radius-lg)]" />
    </div>
  );
}
