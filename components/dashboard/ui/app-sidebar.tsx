"use client"

import * as React from "react"
import {
  IconAlertTriangle,
  IconChefHat,
  IconDashboard,
  IconMapPin,
  IconPackage,
  IconReceipt2,
  IconSettings,
} from "@tabler/icons-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { NavMain } from "@/components/dashboard/ui/nav-main"
import { NavUser } from "@/components/dashboard/ui/nav-user"
import { useDashboardData } from "@/components/dashboard/dashboard-context"
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const dashboard = useDashboardData()
  const navMain = React.useMemo(
    () => [
      {
        title: "Dashboard",
        url: "/protected",
        icon: IconDashboard,
      },
      {
        title: "Inventory",
        url: "/protected#inventory",
        icon: IconPackage,
      },
      {
        title: "Locations",
        url: "/protected#locations",
        icon: IconMapPin,
      },
      {
        title: "Alerts",
        url: "/protected#alerts",
        icon: IconAlertTriangle,
      },
      {
        title: "Receipts",
        url: "/protected#receipts",
        icon: IconReceipt2,
      },
      {
        title: "Kitchen Settings",
        url: "/protected/kitchen-settings",
        icon: IconSettings,
      },
    ],
    []
  )

  const memberName =
    dashboard.user.fullName ?? dashboard.user.firstName ?? dashboard.user.email ?? "KitchenSync Member"
  const memberEmail = dashboard.user.email ?? "member@kitchensync.app"
  const avatarUrl = dashboard.user.avatarUrl ?? "/avatars/shadcn.jpg"

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="/protected">
                <IconChefHat className="!size-5" />
                <span className="text-base font-semibold">KitchenSync</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{
            name: memberName,
            email: memberEmail,
            avatar: avatarUrl,
          }}
        />
      </SidebarFooter>
    </Sidebar>
  )
}
