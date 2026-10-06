import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
  icon?: ReactNode;
};

export function EmptyState({
  title,
  description,
  action,
  className,
  icon,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-border bg-card px-6 py-12 text-center sm:py-14",
        className,
      )}
    >
      {icon ? (
        <div className="mb-4 text-muted-foreground" aria-hidden="true">
          {icon}
        </div>
      ) : null}
      <h2 className="text-base font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
