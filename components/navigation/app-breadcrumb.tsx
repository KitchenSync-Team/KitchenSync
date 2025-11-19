"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

import type { NavMainItem } from "./nav-main";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type AppBreadcrumbProps = {
  baseLabel?: string;
  baseHref: string;
  navItems: Pick<NavMainItem, "title" | "url">[];
};

function formatSegmentLabel(segment: string | undefined) {
  if (!segment) return "";
  const cleaned = segment.replace(/[-_]/g, " ").trim();
  if (!cleaned) return "";
  return cleaned
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function AppBreadcrumb({
  baseLabel = "KitchenSync",
  baseHref,
  navItems,
}: AppBreadcrumbProps) {
  const pathname = usePathname();
  const basePath = pathname ?? baseHref ?? "/";
  const normalizedPath = (basePath || "/").replace(/\/$/, "") || "/";

  const matchedNav = navItems.find((item) => item.url.replace(/\/$/, "") === normalizedPath);

  let derivedLabel: string | null = null;
  if (!matchedNav) {
    const segments = normalizedPath.split("/").filter(Boolean);
    derivedLabel = formatSegmentLabel(segments[segments.length - 1]);
  }

  const crumbs: BreadcrumbItem[] = [
    { label: baseLabel, href: baseHref },
  ];

  const currentLabel = matchedNav?.title ?? derivedLabel;
  if (currentLabel && normalizedPath !== baseHref.replace(/\/$/, "")) {
    crumbs.push({ label: currentLabel });
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-sm text-muted-foreground">
      <ol className="flex items-center gap-1">
        {crumbs.map((crumb, index) => (
          <li key={`${crumb.label}-${index}`} className="flex items-center">
            {index > 0 ? <ChevronRight className="mx-1 h-4 w-4 opacity-60" /> : null}
            {crumb.href ? (
              <Link href={crumb.href} className="hover:text-foreground">
                {crumb.label}
              </Link>
            ) : (
              <span className="text-foreground">{crumb.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
