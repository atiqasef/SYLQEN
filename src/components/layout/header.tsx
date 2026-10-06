"use client";

import { MenuIcon } from "@/components/layout/icons";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";

type HeaderProps = {
  onMenuClick: () => void;
  title?: string;
  description?: string;
};

export function Header({
  onMenuClick,
  title = "Overview",
  description = "Foundation shell for the SYLQEN Business Operating System.",
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-sm">
      <div className="flex h-[var(--header-height)] items-center gap-3 px-4 sm:px-6">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
          aria-label="Open navigation"
          aria-controls="app-sidebar"
        >
          <MenuIcon aria-hidden="true" />
        </Button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold tracking-tight sm:text-base">
            {title}
          </h1>
          <p className="hidden truncate text-xs text-muted-foreground sm:block">
            {description}
          </p>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
