"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDownIcon } from "@/components/layout/icons";

/**
 * Placeholder account menu. Authentication is not implemented in Phase 1.
 */
export function UserMenu() {
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
            SA
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-sm font-medium leading-none">
              Signed out
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">
              Auth coming later
            </span>
          </span>
          <ChevronDownIcon className="text-muted-foreground" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>Profile (coming soon)</DropdownMenuItem>
        <DropdownMenuItem disabled>Workspace (coming soon)</DropdownMenuItem>
        <DropdownMenuItem disabled>Sign in (coming soon)</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
