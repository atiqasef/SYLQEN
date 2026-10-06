"use client";

import { usePathname } from "next/navigation";
import * as React from "react";

import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { SessionContext } from "@/server/auth/types";

type AppShellProps = {
  children: React.ReactNode;
  session: SessionContext;
  title?: string;
  description?: string;
};

function resolveShellMeta(pathname: string, session: SessionContext) {
  if (pathname.startsWith("/customers")) {
    return {
      title: "Customers",
      description: `${session.workspace.name} · customer records`,
    };
  }

  if (pathname.startsWith("/products")) {
    return {
      title: "Products",
      description: `${session.workspace.name} · product catalog`,
    };
  }

  if (pathname.startsWith("/projects")) {
    return {
      title: "Projects",
      description: `${session.workspace.name} · project records`,
    };
  }

  if (pathname.startsWith("/invoices")) {
    return {
      title: "Invoices",
      description: `${session.workspace.name} · invoice records`,
    };
  }

  if (pathname.startsWith("/payments")) {
    return {
      title: "Payments",
      description: `${session.workspace.name} · payment records`,
    };
  }

  return {
    title: "Overview",
    description: `${session.workspace.name} · ${session.membership.role}`,
  };
}

export function AppShell({
  children,
  session,
  title,
  description,
}: AppShellProps) {
  const pathname = usePathname();
  const derived = resolveShellMeta(pathname, session);
  const resolvedTitle = title ?? derived.title;
  const resolvedDescription = description ?? derived.description;
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const closeSidebar = React.useCallback(() => {
    setSidebarOpen(false);
  }, []);

  React.useEffect(() => {
    if (!sidebarOpen) {
      return;
    }

    const media = window.matchMedia("(max-width: 1023px)");
    if (!media.matches) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [sidebarOpen]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-full bg-background">
        <Sidebar open={sidebarOpen} onClose={closeSidebar} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header
            onMenuClick={() => setSidebarOpen(true)}
            menuOpen={sidebarOpen}
            title={resolvedTitle}
            description={resolvedDescription}
            session={session}
          />
          <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            <div className="mx-auto w-full max-w-[var(--content-max)]">
              {children}
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
