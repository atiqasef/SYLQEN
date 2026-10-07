import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";

type AnalyticsLoadingStateProps = {
  label?: string;
  className?: string;
};

/** Layout-shaped loading shell for the Analytics route. */
export function AnalyticsLoadingState({
  label = "Loading analytics",
  className,
}: AnalyticsLoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn("space-y-6 sm:space-y-8", className)}
    >
      <span className="sr-only">{label}</span>

      <div className="max-w-2xl space-y-3">
        <Skeleton className="h-8 w-40 max-w-full" />
        <Skeleton className="h-4 w-full max-w-md" />
        <Skeleton className="h-4 w-3/4 max-w-sm" />
      </div>

      <Skeleton className="h-64 w-full rounded-[var(--radius-lg)]" />

      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-72 w-full rounded-[var(--radius-lg)]" />
        <Skeleton className="h-72 w-full rounded-[var(--radius-lg)]" />
      </div>

      <Skeleton className="h-56 w-full rounded-[var(--radius-lg)]" />
      <Skeleton className="h-56 w-full rounded-[var(--radius-lg)]" />
    </div>
  );
}
