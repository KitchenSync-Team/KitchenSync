"use client";

import { createContext, useContext } from "react";

import type { DashboardData } from "@/lib/dashboard";

type DashboardDataContextValue = {
  dashboard: DashboardData;
};

const DashboardDataContext = createContext<DashboardDataContextValue | null>(null);

export function DashboardDataProvider({
  dashboard,
  children,
}: {
  dashboard: DashboardData;
  children: React.ReactNode;
}) {
  return (
    <DashboardDataContext.Provider value={{ dashboard }}>
      {children}
    </DashboardDataContext.Provider>
  );
}

export function useDashboardData() {
  const context = useContext(DashboardDataContext);
  if (!context) {
    throw new Error("useDashboardData must be used within a DashboardDataProvider");
  }
  return context.dashboard;
}
