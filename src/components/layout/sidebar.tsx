"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import type { ComponentType } from "react";

import {
  BoltIcon,
  ChartIcon,
  CloseIcon,
  FinanceIcon,
  FolderIcon,
  OverviewIcon,
  PlugIcon,
  SettingsIcon,
  TeamIcon,
  UsersIcon,
} from "@/components/layout/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { primaryNav, secondaryNav, siteConfig, type NavItem } from "@/config/site";
import { cn } from "@/lib/utils/cn";

const MOBILE_SIDEBAR_QUERY = "(max-width: 1023px)";

const iconByHref: Record<string, ComponentType<{ className?: string }>> = {
  "/": OverviewIcon,
  "/customers": UsersIcon,
  "/projects": FolderIcon,
  "/finance": FinanceIcon,
  "/team": TeamIcon,
  "/analytics": ChartIcon,
  "/automations": BoltIcon,
  "/settings": SettingsIcon,
  "/integrations": PlugIcon,
};

type SidebarProps = {
  open: boolean;
  onClose: () => void;
};

function NavLink({
  item,
  onNavigate,
}: {
  item: NavItem;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === item.href;
  const Icon = iconByHref[item.href] ?? OverviewIcon;

  const className = cn(
    "group flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm transition-ui",
    active
      ? "bg-sidebar-accent text-sidebar-foreground"
      : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground",
    item.disabled && "cursor-not-allowed opacity-60 hover:bg-transparent hover:text-sidebar-muted",
  );

  const content = (
    <>
      <Icon className="size-[1.05rem]" aria-hidden="true" />
      <span className="flex-1 truncate">{item.title}</span>
      {item.comingSoon ? (
        <Badge
          variant="muted"
          className="border-0 bg-white/8 px-1.5 py-0 text-[10px] text-sidebar-muted"
        >
          Soon
        </Badge>
      ) : null}
    </>
  );

  if (item.disabled) {
    return (
      <span className={className} aria-disabled="true">
        {content}
      </span>
    );
  }

  return (
    <Link href={item.href} className={className} onClick={onNavigate}>
      {content}
    </Link>
  );
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const [isMobileViewport, setIsMobileViewport] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia(MOBILE_SIDEBAR_QUERY);
    const sync = () => setIsMobileViewport(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  // Closed drawer must not remain in the tab order off-screen on small viewports.
  const inertWhenClosed = isMobileViewport && !open;

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        id="app-sidebar"
        inert={inertWhenClosed ? true : undefined}
        aria-hidden={inertWhenClosed || undefined}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[var(--sidebar-width)] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground",
          "transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
          "lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-[var(--header-height)] items-center justify-between gap-3 border-b border-sidebar-border px-4">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2.5"
            onClick={onClose}
          >
            <span
              className="flex size-8 items-center justify-center rounded-[0.55rem] bg-sidebar-ring/15 text-sm font-semibold tracking-tight text-sidebar-ring"
              aria-hidden="true"
            >
              S
            </span>
            <span className="truncate">
              <span className="block text-sm font-semibold tracking-[0.08em]">
                {siteConfig.name}
              </span>
              <span className="block text-[11px] text-sidebar-muted">
                Business OS
              </span>
            </span>
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground lg:hidden"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <CloseIcon aria-hidden="true" />
          </Button>
        </div>

        <nav
          className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4"
          aria-label="Primary"
        >
          <div className="space-y-1">
            <p className="px-3 pb-2 text-[11px] font-medium tracking-[0.12em] text-sidebar-muted uppercase">
              Workspace
            </p>
            {primaryNav.map((item) => (
              <NavLink key={item.href} item={item} onNavigate={onClose} />
            ))}
          </div>

          <div className="mt-auto space-y-1">
            <p className="px-3 pb-2 text-[11px] font-medium tracking-[0.12em] text-sidebar-muted uppercase">
              System
            </p>
            {secondaryNav.map((item) => (
              <NavLink key={item.href} item={item} onNavigate={onClose} />
            ))}
          </div>
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <div className="rounded-[var(--radius-md)] bg-sidebar-accent px-3 py-3">
            <p className="text-xs font-medium text-sidebar-foreground">
              Foundation phase
            </p>
            <p className="mt-1 text-xs leading-5 text-sidebar-muted">
              Modules are placeholders until later phases.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
