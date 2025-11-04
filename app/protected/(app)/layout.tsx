import type { ReactNode } from "react";
import { cookies } from "next/headers";

import { AppSidebar } from "@/components/app-sidebar";
import { resolveDashboardData } from "@/app/protected/_lib/resolve-dashboard-data";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export default async function ProtectedAppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";

  // Ensure the user is authenticated and onboarded before rendering protected routes.
  await resolveDashboardData();

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />
      <SidebarInset className="flex min-h-svh flex-1 flex-col">
        <header className="flex h-16 items-center border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <span className="ml-4 text-sm text-muted-foreground">KitchenSync</span>
        </header>
        <main className="flex flex-1 flex-col p-4">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
