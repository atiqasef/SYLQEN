import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

type AuthMessageProps = {
  children: ReactNode;
  className?: string;
};

/** Form-level error affordance shared across auth screens. */
export function AuthAlert({ children, className }: AuthMessageProps) {
  return (
    <p
      role="alert"
      className={cn(
        "rounded-[var(--radius-md)] border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-sm leading-5 text-destructive",
        className,
      )}
    >
      {children}
    </p>
  );
}

/** Neutral / success status copy shared across auth screens. */
export function AuthStatus({ children, className }: AuthMessageProps) {
  return (
    <p
      role="status"
      className={cn(
        "rounded-[var(--radius-md)] border border-border bg-muted/70 px-3 py-2.5 text-sm leading-5 text-muted-foreground",
        className,
      )}
    >
      {children}
    </p>
  );
}
