"use client"

import * as React from "react"
import Link from "next/link"
import { Check, ChevronsUpDown } from "lucide-react"

import { NavMain, type NavMainItem } from "@/components/navigation/nav-main"
import { NavUser, type NavUserData } from "@/components/navigation/nav-user"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { getKitchenIcon, type KitchenIconId } from "@/components/navigation/kitchen-icons"

type KitchenOption = {
  id: string
  name: string
  href?: string
  isActive?: boolean
  iconKey?: KitchenIconId
}

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  kitchenName: string
  kitchenIconKey?: KitchenIconId
  kitchenMeta?: string | null
  kitchenOptions?: KitchenOption[]
  navMain: NavMainItem[]
  user: NavUserData
}

export function AppSidebar({
  kitchenName,
  kitchenIconKey,
  kitchenMeta,
  kitchenOptions,
  navMain,
  user,
  ...props
}: AppSidebarProps) {
  const options =
    kitchenOptions && kitchenOptions.length > 0
      ? kitchenOptions
      : [{ id: "active", name: kitchenName, isActive: true, iconKey: kitchenIconKey }]

  const activeKitchen = options.find((option) => option.isActive) ?? options[0]!
  const ActiveIcon = getKitchenIcon(activeKitchen.iconKey ?? kitchenIconKey)

  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent/60">
                  <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                    <ActiveIcon className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{activeKitchen.name}</span>
                    {kitchenMeta ? (
                      <span className="truncate text-xs text-muted-foreground">{kitchenMeta}</span>
                    ) : null}
                  </div>
                  {options.length > 1 ? (
                    <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
                  ) : null}
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              {options.length > 1 ? (
                <DropdownMenuContent align="start" className="min-w-48">
                  <DropdownMenuLabel>Switch kitchen</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {options.map((option) => (
                    <DropdownMenuItem key={option.id} asChild>
                      <Link href={option.href ?? "#"} className="flex items-center gap-2">
                        <span className="flex-1 truncate">{option.name}</span>
                        {option.isActive ? (
                          <Check className="size-4 text-sidebar-primary" />
                        ) : null}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              ) : null}
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} label="Kitchen" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
