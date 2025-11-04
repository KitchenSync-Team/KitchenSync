"use client"

import Link from "next/link"

import { getSidebarIcon, type SidebarIconKey } from "@/components/sidebar-icons"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export type NavProjectItem = {
  name: string
  url: string
  icon?: SidebarIconKey
}

export function NavProjects({
  projects,
  label = "Locations",
}: {
  projects: NavProjectItem[]
  label?: string
}) {
  if (!projects.length) {
    return null
  }

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu>
        {projects.map((item) => {
          const Icon = getSidebarIcon(item.icon)
          return (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton asChild>
                <Link href={item.url}>
                  {Icon ? <Icon /> : null}
                  <span>{item.name}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
