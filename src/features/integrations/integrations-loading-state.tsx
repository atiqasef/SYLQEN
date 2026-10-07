import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";

type IntegrationsLoadingStateProps = {
  label?: string;
  className?: string;
};

export function IntegrationsLoadingState({
  label = "Loading integrations",
  className,
}: IntegrationsLoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn("space-y-6 sm:space-y-8", className)}
    >
      <span className="sr-only">{label}</span>
      <div className="max-w-2xl space-y-3">
        <Skeleton className="h-8 w-44 max-w-full" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton
            key={index}
            className="h-56 w-full rounded-[var(--radius-lg)]"
          />
        ))}
      </div>
    </div>
  );
}
