import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { resolveDashboardData } from "@/components/dashboard/resolve-dashboard-data";

import "@/app/protected/theme.css";

export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";
  const dashboard = await resolveDashboardData();

  if (!dashboard.user.onboardingComplete) {
    redirect("/protected/onboarding");
  }

  return (
    <DashboardShell dashboard={dashboard} defaultOpen={defaultOpen}>
      {children}
    </DashboardShell>
  );
}
