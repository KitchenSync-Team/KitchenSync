import { cookies } from "next/headers";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { resolveDashboardData } from "@/components/dashboard/resolve-dashboard-data";

import "@/app/protected/theme.css";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";
  const dashboard = await resolveDashboardData();

  return (
    <DashboardShell dashboard={dashboard} defaultOpen={defaultOpen}>
      {children}
    </DashboardShell>
  );
}
