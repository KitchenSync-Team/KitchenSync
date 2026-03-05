import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { NotificationBell } from "@/components/navigation/notification-bell";
import { resolveKitchen } from "@/app/protected/_lib/resolve-kitchen";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { AppSidebar } from "@/components/navigation/app-sidebar";
import type { NavMainItem } from "@/components/navigation/nav-main";
import type { NavUserData } from "@/components/navigation/nav-user";
import { defaultKitchenIconId, isKitchenIconId } from "@/components/navigation/kitchen-icons";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppBreadcrumb } from "@/components/navigation/app-breadcrumb";

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

  // Load pending kitchen invitations for the current user (service role bypasses RLS on kitchens).
  type PendingInvite = { id: string; kitchenId: string; kitchenName: string; role: string };
  let pendingInvites: PendingInvite[] = [];
  if (user.email) {
    const admin = createServiceRoleClient();
    const { data } = await admin
      .from("kitchen_invitations")
      .select("id, kitchen_id, role, kitchens(name)")
      .eq("email", user.email)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString());
    if (data) {
      pendingInvites = data.map((row) => ({
        id: row.id,
        kitchenId: row.kitchen_id,
        kitchenName: (row.kitchens as unknown as { name: string } | null)?.name ?? "Unknown kitchen",
        role: row.role ?? "member",
      }));
    }
  }

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
            <div className="ml-4">
              <AppBreadcrumb baseHref="/protected" navItems={navMain} />
            </div>
          </div>

          {/* Right Section: The New Notification Bell */}
          <div className="flex items-center gap-2">
            <NotificationBell pendingInvites={pendingInvites} />
          </div>
        </header>

        <main className="flex flex-1 flex-col p-4">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
