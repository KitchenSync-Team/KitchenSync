"use client";

import type { CSSProperties, ReactNode } from "react";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/ui/app-sidebar";
import { SiteHeader } from "@/components/dashboard/ui/site-header";
import type { DashboardData } from "@/lib/dashboard";
import { DashboardDataProvider } from "@/components/dashboard/dashboard-context";

export function DashboardShell({
  dashboard,
  children,
  defaultOpen = true,
}: {
  dashboard: DashboardData;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <DashboardDataProvider dashboard={dashboard}>
      <SidebarProvider
        defaultOpen={defaultOpen}
        style={{ "--sidebar-width": "calc(var(--spacing) * 72)" } as CSSProperties}
      >
        <AppSidebar />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col gap-2 px-4 pb-12 pt-6 md:gap-6 md:px-6">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </DashboardDataProvider>
  );
}
