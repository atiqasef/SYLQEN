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

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  item,
  onNavigate,
}: {
  item: NavItem;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = !item.disabled && isActivePath(pathname, item.href);
  const Icon = iconByHref[item.href] ?? OverviewIcon;

  const className = cn(
    "group relative flex items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-1.5 text-sm transition-ui",
    active
      ? "bg-sidebar-accent font-medium text-sidebar-foreground"
      : "text-sidebar-muted hover:bg-sidebar-accent/80 hover:text-sidebar-foreground",
    item.disabled &&
      "cursor-not-allowed opacity-55 hover:bg-transparent hover:text-sidebar-muted",
  );

  const content = (
    <>
      {active ? (
        <span
          aria-hidden="true"
          className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-sidebar-ring"
        />
      ) : null}
      <Icon
        className={cn(
          "size-4",
          active ? "text-sidebar-ring" : "text-current",
        )}
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1 truncate">{item.title}</span>
      {item.comingSoon ? (
        <Badge
          variant="muted"
          className="border-0 bg-white/8 px-1.5 py-0 text-[10px] font-medium text-sidebar-muted"
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
    <Link
      href={item.href}
      className={className}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
    >
      {content}
    </Link>
  );
}

function NavSection({
  label,
  items,
  onNavigate,
  className,
}: {
  label: string;
  items: NavItem[];
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("space-y-0.5", className)}>
      <p className="px-2.5 pb-1.5 text-[11px] font-medium tracking-[0.12em] text-sidebar-muted uppercase">
        {label}
      </p>
      {items.map((item) => (
        <NavLink key={item.href} item={item} onNavigate={onNavigate} />
      ))}
    </div>
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

  React.useEffect(() => {
    if (!open || !isMobileViewport) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, isMobileViewport, onClose]);

  // Closed drawer must not remain in the tab order off-screen on small viewports.
  const inertWhenClosed = isMobileViewport && !open;

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/45 transition-opacity lg:hidden",
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
        <div className="flex h-[var(--header-height)] items-center justify-between gap-2 border-b border-sidebar-border px-3 sm:px-3.5">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2.5 rounded-[var(--radius-md)] px-0.5 transition-ui"
            onClick={onClose}
          >
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-[0.55rem] bg-sidebar-ring/15 text-sm font-semibold tracking-tight text-sidebar-ring"
              aria-hidden="true"
            >
              S
            </span>
            <span className="min-w-0 truncate">
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
            className="shrink-0 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground lg:hidden"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <CloseIcon aria-hidden="true" />
          </Button>
        </div>

        <nav
          className="flex flex-1 flex-col gap-5 overflow-y-auto px-2.5 py-3"
          aria-label="Primary"
        >
          <NavSection
            label="Workspace"
            items={primaryNav}
            onNavigate={onClose}
          />
          <NavSection
            label="System"
            items={secondaryNav}
            onNavigate={onClose}
            className="mt-auto"
          />
        </nav>

        <div className="border-t border-sidebar-border px-3.5 py-3">
          <p className="text-xs font-medium text-sidebar-foreground">
            Foundation phase
          </p>
          <p className="mt-1 text-xs leading-5 text-sidebar-muted">
            Modules are placeholders until later phases.
          </p>
        </div>
      </aside>
    </>
  );
}
