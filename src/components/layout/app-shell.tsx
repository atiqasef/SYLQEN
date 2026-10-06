"use client";

import * as React from "react";

import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

type AppShellProps = {
  children: React.ReactNode;
  title?: string;
  description?: string;
};

export function AppShell({ children, title, description }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-full bg-background">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header
            onMenuClick={() => setSidebarOpen(true)}
            title={title}
            description={description}
          />
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-[var(--content-max)]">
              {children}
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
