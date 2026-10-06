import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

type ErrorStateProps = {
  title?: string;
  description?: string;
  reset?: () => void;
  className?: string;
};

export function ErrorState({
  title = "Something went wrong",
  description = "An unexpected error occurred. Please try again.",
  reset,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-start gap-4 rounded-[var(--radius-lg)] border border-border bg-card p-6 shadow-panel",
        className,
      )}
    >
      <div>
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
      {reset ? (
        <Button type="button" variant="outline" onClick={reset}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
