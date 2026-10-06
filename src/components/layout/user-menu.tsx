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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="h-10 gap-2 px-2.5"
          aria-label="Account menu"
        >
          <span
            className="flex size-7 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground"
            aria-hidden="true"
          >
            {initials(session.user.name) || "SQ"}
          </span>
          <span className="hidden min-w-0 text-left sm:block">
            <span className="block truncate text-sm font-medium leading-none">
              {session.user.name}
            </span>
            <span className="mt-1 block truncate text-xs text-muted-foreground">
              {session.workspace.name}
            </span>
          </span>
          <ChevronDownIcon className="text-muted-foreground" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="space-y-1 font-normal">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {session.user.name}
            </span>
            {session.user.isDemo ? <Badge variant="warning">Demo</Badge> : null}
          </div>
          <p className="text-xs text-muted-foreground">{session.user.email}</p>
          <p className="text-xs text-muted-foreground">
            {session.workspace.name} · {session.membership.role}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>Account settings (coming soon)</DropdownMenuItem>
        <DropdownMenuItem disabled>Workspace settings (coming soon)</DropdownMenuItem>
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
