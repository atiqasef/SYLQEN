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
    <div className="relative flex min-h-full flex-col bg-background">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,color-mix(in_oklab,var(--primary)_12%,transparent),transparent_55%)]"
      />
      <header className="relative z-10 flex items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/login" className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-[0.6rem] bg-primary text-sm font-semibold text-primary-foreground">
            S
          </span>
          <span>
            <span className="block text-sm font-semibold tracking-[0.08em]">
              {siteConfig.name}
            </span>
            <span className="block text-[11px] text-muted-foreground">
              Business Operating System
            </span>
          </span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-8 sm:px-6">
        <div className={cn("w-full max-w-[420px]", className)}>
          <div className="mb-8 space-y-2 text-center sm:text-left">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {title}
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
          <div className="rounded-[var(--radius-lg)] border border-border bg-card p-6 shadow-panel sm:p-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
