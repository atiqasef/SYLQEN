"use client";

import { BellIcon, MenuIcon } from "@/components/layout/icons";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
      <div className="flex h-[var(--header-height)] items-center gap-2 px-3 sm:gap-3 sm:px-6 lg:px-8">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 lg:hidden"
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

        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground"
                  disabled
                  aria-disabled="true"
                  aria-label="Notifications (coming soon)"
                >
                  <BellIcon aria-hidden="true" />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>Notifications coming soon</TooltipContent>
          </Tooltip>
          <ThemeToggle />
          <UserMenu session={session} />
        </div>
      </div>
    </header>
  );
}
