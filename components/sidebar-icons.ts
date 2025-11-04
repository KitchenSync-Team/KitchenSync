"use client"

import {
  ChefHat,
  CircleUserRound,
  Command,
  LayoutDashboard,
  MapPin,
  Settings2,
  Users2,
} from "lucide-react"

const sidebarIcons = {
  command: Command,
  "chef-hat": ChefHat,
  "layout-dashboard": LayoutDashboard,
  "settings-2": Settings2,
  "user-circle": CircleUserRound,
  "users": Users2,
  "map-pin": MapPin,
} as const

export type SidebarIconKey = keyof typeof sidebarIcons

export function getSidebarIcon(name?: SidebarIconKey) {
  if (!name) return undefined
  return sidebarIcons[name]
}
