import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";

export function AutomationsLoadingState({
  label = "Loading automations",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn("space-y-6 sm:space-y-8", className)}
    >
      <span className="sr-only">{label}</span>
      <div className="max-w-2xl space-y-3">
        <Skeleton className="h-8 w-48 max-w-full" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <Skeleton className="h-64 w-full rounded-[var(--radius-lg)]" />
    </div>
  );
}
