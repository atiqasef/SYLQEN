import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";

type MembersLoadingStateProps = {
  label?: string;
  className?: string;
};

/** List-shaped loading shell for the Team route. */
export function MembersLoadingState({
  label = "Loading team",
  className,
}: MembersLoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn("space-y-6 sm:space-y-8", className)}
    >
      <span className="sr-only">{label}</span>

      <div className="max-w-2xl space-y-3">
        <Skeleton className="h-8 w-28 max-w-full" />
        <Skeleton className="h-4 w-full max-w-md" />
        <Skeleton className="h-4 w-3/4 max-w-sm" />
      </div>

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-panel">
        <div className="space-y-2 border-b border-border px-4 py-3 sm:px-5">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="divide-y divide-border px-4 sm:px-5">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center justify-between gap-4 py-4"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Skeleton className="size-9 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-36 max-w-full" />
                  <Skeleton className="h-3 w-48 max-w-full" />
                </div>
              </div>
              <Skeleton className="hidden h-7 w-20 sm:block" />
              <Skeleton className="hidden h-4 w-16 md:block" />
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
