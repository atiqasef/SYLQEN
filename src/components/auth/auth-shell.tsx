import Link from "next/link";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils/cn";

type AuthShellProps = {
  children: React.ReactNode;
  title: string;
  description: string;
  className?: string;
};

export function AuthShell({
  children,
  title,
  description,
  className,
}: AuthShellProps) {
  return (
    <div className="flex min-h-full flex-col bg-background">
      <header className="flex h-[var(--header-height)] items-center justify-between border-b border-border px-4 sm:px-6 lg:px-8">
        <Link
          href="/login"
          className="flex min-w-0 items-center gap-2.5 rounded-[var(--radius-md)] transition-ui focus-visible:outline-none"
        >
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-[0.55rem] bg-primary text-sm font-semibold text-primary-foreground"
            aria-hidden="true"
          >
            S
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold tracking-[0.08em] text-foreground">
              {siteConfig.name}
            </span>
            <span className="block truncate text-[11px] text-muted-foreground">
              Business Operating System
            </span>
          </span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-8 sm:items-center sm:px-6 sm:py-12">
        <div className={cn("w-full max-w-[26.25rem]", className)}>
          <div className="mb-6 space-y-2 sm:mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem] sm:leading-tight">
              {title}
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
          <div className="rounded-[var(--radius-lg)] border border-border bg-card p-5 shadow-panel sm:p-7">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
