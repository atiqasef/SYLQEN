import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";

type DetailLoadingStateProps = {
  label?: string;
  className?: string;
};

/**
 * Detail-route loading shell (no list search/CTA flash).
 * Approximates breadcrumb + title + content cards.
 */
export function DetailLoadingState({
  label = "Loading",
  className,
}: DetailLoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn("space-y-6 sm:space-y-8", className)}
    >
      <span className="sr-only">{label}</span>

      <div className="space-y-3">
        <Skeleton className="h-4 w-28" />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 max-w-2xl flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-8 w-48 max-w-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full max-w-md" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-[var(--radius-lg)] border border-border bg-card p-5 shadow-panel sm:p-6">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="space-y-3 rounded-[var(--radius-lg)] border border-border bg-card p-5 shadow-panel sm:p-6">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    </div>
  );
}
