"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDownIcon } from "@/components/layout/icons";
import type { SessionContext } from "@/server/auth/types";
import { signOutAction } from "@/server/auth/actions";

type UserMenuProps = {
  session: SessionContext;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function UserMenu({ session }: UserMenuProps) {
  const avatar = initials(session.user.name) || "SQ";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="h-9 max-w-[12.5rem] gap-2 px-2 sm:max-w-[16rem] sm:px-2.5"
          aria-label="Account menu"
        >
          <span
            className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-secondary-foreground"
            aria-hidden="true"
          >
            {avatar}
          </span>
          <span className="hidden min-w-0 text-left sm:block">
            <span className="block truncate text-sm font-medium leading-none">
              {session.user.name}
            </span>
            <span className="mt-1 block truncate text-xs text-muted-foreground">
              {session.workspace.name}
            </span>
          </span>
          <ChevronDownIcon
            className="hidden text-muted-foreground sm:block"
            aria-hidden="true"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="space-y-2 font-normal">
          <div className="flex items-start gap-2.5">
            <span
              className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground"
              aria-hidden="true"
            >
              {avatar}
            </span>
            <div className="min-w-0 space-y-1">
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                <span className="truncate text-sm font-medium text-foreground">
                  {session.user.name}
                </span>
                {session.user.isDemo ? (
                  <Badge variant="warning">Demo</Badge>
                ) : null}
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {session.user.email}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {session.workspace.name} · {session.membership.role}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          Account settings (coming soon)
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          Workspace settings (coming soon)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            void signOutAction();
          }}
        >
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
