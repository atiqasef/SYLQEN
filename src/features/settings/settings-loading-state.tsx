import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";

type SettingsLoadingStateProps = {
  label?: string;
  className?: string;
};

/** Section-shaped loading shell for the Settings route. */
export function SettingsLoadingState({
  label = "Loading settings",
  className,
}: SettingsLoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn("space-y-6 sm:space-y-8", className)}
    >
      <span className="sr-only">{label}</span>

      <div className="max-w-2xl space-y-3">
        <Skeleton className="h-8 w-32 max-w-full" />
        <Skeleton className="h-4 w-full max-w-md" />
        <Skeleton className="h-4 w-3/4 max-w-sm" />
      </div>

      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-panel"
        >
          <div className="space-y-2 border-b border-border px-4 py-3.5 sm:px-5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-48 max-w-full" />
          </div>
          <div className="space-y-4 px-4 py-4 sm:px-5">
            <Skeleton className="h-9 w-full max-w-md" />
            <Skeleton className="h-9 w-full max-w-sm" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
      ))}
    </div>
  );
}
