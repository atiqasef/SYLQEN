"use client";

import { MenuIcon } from "@/components/layout/icons";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import type { SessionContext } from "@/server/auth/types";

type HeaderProps = {
  onMenuClick: () => void;
  menuOpen?: boolean;
  title?: string;
  description?: string;
  session: SessionContext;
};

export function Header({
  onMenuClick,
  menuOpen = false,
  title = "Overview",
  description = "Foundation shell for the SYLQEN Business Operating System.",
  session,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background">
      <div className="flex h-[var(--header-height)] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
          aria-label="Open navigation"
          aria-controls="app-sidebar"
          aria-expanded={menuOpen}
        >
          <MenuIcon aria-hidden="true" />
        </Button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold tracking-tight text-foreground sm:text-[0.9375rem]">
            {title}
          </h1>
          <p className="mt-0.5 hidden truncate text-xs text-muted-foreground sm:block">
            {description}
          </p>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          <UserMenu session={session} />
        </div>
      </div>
    </header>
  );
}
