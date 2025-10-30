"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight } from "lucide-react"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { useDashboardData } from "@/components/dashboard/dashboard-context"

function formatSegment(segment: string) {
  return segment
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export function SiteHeader() {
  const dashboard = useDashboardData()
  const pathname = usePathname()

  const segments = pathname
    .split("/")
    .filter(Boolean)

  const protectedIndex = segments.indexOf("protected")
  const relevantSegments =
    protectedIndex === -1 ? segments : segments.slice(protectedIndex + 1)

  const breadcrumbs: { label: string; href?: string }[] = []

  breadcrumbs.push({ label: dashboard.kitchen.name ?? "Kitchen", href: "/protected" })

  if (relevantSegments.length === 0) {
    breadcrumbs.push({ label: "Dashboard" })
  } else {
    let href = "/protected"
    relevantSegments.forEach((segment, index) => {
      href += `/${segment}`
      const label = formatSegment(decodeURIComponent(segment))
      const isLast = index === relevantSegments.length - 1
      breadcrumbs.push({ label, href: isLast ? undefined : href })
    })
  }

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm font-medium">
          {breadcrumbs.map((crumb, index) => (
            <div key={`${crumb.label}-${index}`} className="flex items-center gap-1">
              {index > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span>{crumb.label}</span>
              )}
            </div>
          ))}
        </nav>
      </div>
    </header>
  )
}
