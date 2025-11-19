import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { NotificationBell } from "@/components/navigation/notification-bell";
import { resolveKitchen } from "@/app/protected/_lib/resolve-kitchen";
import { AppSidebar } from "@/components/navigation/app-sidebar";
import type { NavMainItem } from "@/components/navigation/nav-main";
import type { NavUserData } from "@/components/navigation/nav-user";
import { defaultKitchenIconId, isKitchenIconId } from "@/components/navigation/kitchen-icons";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export default async function ProtectedAppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";

  // Ensure the user is authenticated, onboarded, and load their kitchen context.
  const kitchenSnapshot = await resolveKitchen();

  const {
    kitchen,
    user,
  } = kitchenSnapshot;

  const kitchenMeta =
    typeof kitchen.memberCount === "number"
      ? `${kitchen.memberCount} member${kitchen.memberCount === 1 ? "" : "s"}`
      : null;

  const navMain: NavMainItem[] = [
    {
      title: "Dashboard",
      url: "/protected",
      icon: "layout-dashboard",
    },
    {
      title: "Inventory",
      url: "/protected/inventory",
      icon: "map-pin",
    },
    {
      title: "Recipes",
      url: "/protected/recipes",
      icon: "chef-hat",
    },
    {
      title: "Kitchen Settings",
      url: "/protected/kitchen-settings",
      icon: "settings-2",
    },
  ];

  const inferredName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  const userNavData: NavUserData = {
    name: user.fullName ?? (inferredName ? inferredName : null),
    email: user.email,
    avatarUrl: user.avatarUrl ?? undefined,
  };

  const kitchenIconKey = isKitchenIconId(kitchen.iconKey) ? kitchen.iconKey : defaultKitchenIconId;

  const kitchenOptions = [
    {
      id: kitchen.id,
      name: kitchen.name,
      href: "/protected/kitchen-settings",
      isActive: true,
      iconKey: kitchenIconKey,
    },
  ];

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar
        kitchenName={kitchen.name}
        kitchenIconKey={kitchenIconKey}
        kitchenMeta={kitchenMeta}
        kitchenOptions={kitchenOptions}
        navMain={navMain}
        user={userNavData}
      />
      <SidebarInset className="flex min-h-svh flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b px-4">
          {/* Left Section: Trigger & Brand Name */}
          <div className="flex items-center">
            <SidebarTrigger className="-ml-1" />
            <span className="ml-4 text-sm text-muted-foreground">KitchenSync</span>
          </div>

          {/* Right Section: The New Notification Bell */}
          <div className="flex items-center gap-2">
            <NotificationBell />
          </div>
        </header>

        <main className="flex flex-1 flex-col p-4">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
