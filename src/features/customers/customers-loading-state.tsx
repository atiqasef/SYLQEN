import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";

type CustomersLoadingStateProps = {
  label?: string;
  className?: string;
};

/** List-shaped loading shell for Customers routes. */
export function CustomersLoadingState({
  label = "Loading customers",
  className,
}: CustomersLoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn("space-y-6 sm:space-y-8", className)}
    >
      <span className="sr-only">{label}</span>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-xl space-y-3">
          <Skeleton className="h-8 w-40 max-w-full" />
          <Skeleton className="h-4 w-full max-w-md" />
          <Skeleton className="h-4 w-3/4 max-w-sm" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      <Skeleton className="h-[7.5rem] w-full rounded-[var(--radius-lg)]" />

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-panel">
        <div className="space-y-2 border-b border-border px-4 py-3 sm:px-5">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="space-y-0 divide-y divide-border px-4 sm:px-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center justify-between gap-4 py-3.5"
            >
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-40 max-w-full" />
                <Skeleton className="h-3 w-56 max-w-full" />
              </div>
              <Skeleton className="hidden h-4 w-24 sm:block" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
