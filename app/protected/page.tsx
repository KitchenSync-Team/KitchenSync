import { redirect } from "next/navigation";

import {
  MissingKitchenError,
  fetchDashboardData,
  type KitchenMember,
} from "@/lib/dashboard";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertTriangle,
  BellRing,
  Boxes,
  CalendarClock,
  CalendarX2,
  Clock,
  Home,
  Package,
  Receipt,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  let dashboard;
  try {
    dashboard = await fetchDashboardData(supabase, user.id);
  } catch (error) {
    if (error instanceof MissingKitchenError) {
      redirect("/protected/onboarding");
    }
    throw error;
  }

  if (!dashboard.user.onboardingComplete) {
    redirect("/protected/onboarding");
  }

  const preferredName =
    dashboard.user.firstName ??
    (dashboard.user.fullName
      ? dashboard.user.fullName.split(" ")[0]
      : null) ??
    (dashboard.user.email ? dashboard.user.email.split("@")[0] : null) ??
    "KitchenSync member";
  const memberCount = dashboard.kitchen.memberCount;

  return (
    <div className="flex flex-col gap-8 pb-16">
      <header className="flex flex-col gap-4 rounded-2xl border bg-background/80 p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-lime-700 dark:text-lime-300">
              Welcome back
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Good to see you, {preferredName}
            </h1>
            <p className="text-sm text-muted-foreground">
              Here&apos;s what&apos;s happening across your KitchenSync kitchen today.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-secondary-foreground">
            <Home className="h-4 w-4" />
            {dashboard.kitchen.name}
          </span>
          <Badge variant="outline">
            <Users className="mr-2 h-3.5 w-3.5" />
            {typeof memberCount === "number"
              ? `${memberCount} member${memberCount === 1 ? "" : "s"}`
              : "Members"}
          </Badge>
          {dashboard.kitchen.updatedAt ? (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              Updated {formatRelativeDate(dashboard.kitchen.updatedAt)}
            </span>
          ) : null}
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Active items"
          value={formatNumber(dashboard.stats.totalItems)}
          description="Distinct pantry records across your kitchen"
          icon={Boxes}
        />
        <StatCard
          title="Inventory units"
          value={formatNumber(dashboard.stats.totalUnits)}
          description="Individual stock entries you&apos;re tracking"
          icon={Package}
        />
        <StatCard
          title="Expiring soon"
          value={formatNumber(dashboard.stats.expiringSoon)}
          description="Due within the next 7 days"
          icon={CalendarClock}
        />
        <StatCard
          title="Expired"
          value={formatNumber(dashboard.stats.expired)}
          description="Past their freshness window"
          icon={CalendarX2}
        />
        <StatCard
          title="Open alerts"
          value={formatNumber(dashboard.stats.activeAlerts)}
          description="Unacknowledged reminders waiting"
          icon={BellRing}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-12">
        <Card className="xl:col-span-7">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Stock by location</CardTitle>
              <CardDescription>
                Balance your storage zones to avoid forgotten ingredients.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {dashboard.kitchen.locations.length === 0 ? (
              <EmptyState message="No kitchen locations yet. Add a pantry, fridge, or freezer to start organizing." />
            ) : (
              <div className="space-y-4">
                {renderLocationRows(dashboard.kitchen.locations)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-5">
          <CardHeader>
            <CardTitle className="text-lg">Kitchen roster</CardTitle>
            <CardDescription>
              Everyone with pantry access and their collaboration role.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.isArray(dashboard.kitchen.members) ? (
              dashboard.kitchen.members.length === 0 ? (
                <EmptyState message="Invite teammates or family to share your KitchenSync pantry." />
              ) : (
                <div className="space-y-3">
                  {dashboard.kitchen.members.map((member: KitchenMember) => (
                    <div
                      key={member.userId}
                      className="flex items-center justify-between rounded-lg border px-3 py-2"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {member.name ?? member.email ?? "Member"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {member.email ?? "Email pending"}
                        </span>
                      </div>
                      <Badge variant="secondary" className="uppercase">
                        {member.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <EmptyState message="Kitchen roster is unavailable until membership policies are updated." />
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-12">
        <Card className="xl:col-span-7">
          <CardHeader>
            <CardTitle className="text-lg">Expiring within 7 days</CardTitle>
            <CardDescription>
              Use these ingredients soon to stay ahead of waste.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {dashboard.upcomingExpirations.length === 0 ? (
              <EmptyState message="No items are approaching expiration. Great job staying on top of your pantry!" />
            ) : (
              <div className="space-y-3">
                {dashboard.upcomingExpirations.map((unit) => (
                  <div
                    key={unit.id}
                    className="flex flex-col gap-2 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium">
                        {unit.name}
                        {unit.brand ? (
                          <span className="text-muted-foreground">
                            {" "}• {unit.brand}
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {renderLocationAndQuantity(unit.location, unit.quantity, unit.uom)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={badgeVariantForDays(unit.expiresAt)}
                        className="uppercase"
                      >
                        {formatExpirationPill(unit.expiresAt)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6 xl:col-span-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Open alerts</CardTitle>
                <CardDescription>
                  Resolve reminders to reset your freshness score.
                </CardDescription>
              </div>
              <Badge variant="outline">{dashboard.stats.activeAlerts}</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {dashboard.activeAlerts.length === 0 ? (
                <EmptyState message="You&apos;re all caught up—no outstanding alerts." />
              ) : (
                dashboard.activeAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex flex-col gap-2 rounded-lg border px-3 py-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {alert.itemName}
                      </span>
                      <Badge
                        variant={alert.type === "expired" ? "destructive" : "secondary"}
                        className="uppercase"
                      >
                        {alert.type === "expired" ? "Expired" : "Expiring"}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {formatRelativeDate(alert.alertDate)}
                      </span>
                      <span>{renderLocationAndQuantity(alert.location, alert.quantity, alert.uom)}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Latest receipts</CardTitle>
                <CardDescription>
                  Keep scanning groceries so KitchenSync can auto-stock.
                </CardDescription>
              </div>
              <Receipt className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-3">
              {dashboard.recentReceipts.length === 0 ? (
                <EmptyState message="No receipts yet. Upload one to start building history." />
              ) : (
                dashboard.recentReceipts.map((receipt) => (
                  <div
                    key={receipt.id}
                    className="flex items-center justify-between rounded-lg border px-3 py-2"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {receipt.merchantName ?? "Receipt"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {receipt.purchasedAt
                          ? formatRelativeDate(receipt.purchasedAt)
                          : "Date unknown"}
                      </span>
                    </div>
                    <span className="text-sm font-semibold">
                      {receipt.total != null
                        ? formatCurrency(receipt.total)
                        : "—"}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

type StatCardProps = {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
};

function StatCard({ title, value, description, icon: Icon }: StatCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {title}
          </CardTitle>
          <span className="text-3xl font-semibold">{value}</span>
        </div>
        <div className="rounded-full bg-lime-100 p-3 text-lime-700 dark:bg-lime-900/40 dark:text-lime-200">
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent className="pt-0 text-xs text-muted-foreground">
        {description}
      </CardContent>
    </Card>
  );
}

type LocationRow = {
  id: string;
  name: string;
  isDefault: boolean;
  totalUnits: number;
};

function renderLocationRows(locations: LocationRow[]) {
  const maxUnits = Math.max(1, ...locations.map((location) => location.totalUnits));
  const totalUnits = locations.reduce((acc, location) => acc + location.totalUnits, 0);
  const rows = locations.map((location) => {
    const progress = Math.round((location.totalUnits / maxUnits) * 100);
    return (
      <div key={location.id} className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium">{location.name}</span>
            {location.isDefault ? <Badge variant="secondary">Default</Badge> : null}
          </div>
          <span className="text-xs text-muted-foreground">
            {formatNumber(location.totalUnits)} unit
            {location.totalUnits === 1 ? "" : "s"}
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-lime-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  });

  if (totalUnits === 0) {
    rows.push(
      <p key="empty" className="text-xs text-muted-foreground">
        Add inventory to see distribution across locations.
      </p>,
    );
  }

  return rows;
}

type BadgeVariant = "default" | "secondary" | "outline" | "destructive";

function badgeVariantForDays(expiresAt: string | null): BadgeVariant {
  if (!expiresAt) return "outline";
  const days = daysUntil(expiresAt);
  if (days < 0) return "destructive";
  if (days <= 2) return "destructive";
  if (days <= 4) return "default";
  return "secondary";
}

function formatExpirationPill(expiresAt: string | null) {
  if (!expiresAt) return "No date";
  const days = daysUntil(expiresAt);
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} past due`;
  if (days === 0) return "Expires today";
  if (days === 1) return "In 1 day";
  return `In ${days} days`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

function formatRelativeDate(value: string | null) {
  if (!value) return "Unknown";
  const parsed = parseDate(value);
  if (!parsed) return "Unknown";
  const now = new Date();
  const diffInMs = parsed.getTime() - startOfDay(now).getTime();
  const diffInDays = Math.round(diffInMs / 86_400_000);

  if (diffInDays === 0) return "today";
  if (diffInDays === 1) return "tomorrow";
  if (diffInDays === -1) return "yesterday";
  if (diffInDays > 1 && diffInDays <= 7) return `in ${diffInDays} days`;
  if (diffInDays < -1 && diffInDays >= -7) return `${Math.abs(diffInDays)} days ago`;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: parsed.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  }).format(parsed);
}

function renderLocationAndQuantity(
  location: string | null,
  quantity: number,
  uom: string,
) {
  const locationLabel = location ?? "Unassigned";
  const displayUom = uom ?? "each";
  const formattedQuantity = `${quantity} ${displayUom}`;
  return `${locationLabel} • ${formattedQuantity}`;
}

function daysUntil(value: string) {
  const target = parseDate(value);
  if (!target) return 0;
  const now = startOfDay(new Date());
  const diff = Math.round((target.getTime() - now.getTime()) / 86_400_000);
  return diff;
}

function parseDate(value: string) {
  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }

  const dateParts = value.split("-");
  if (dateParts.length === 3) {
    const [year, month, day] = dateParts.map((part) => Number(part));
    if (Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)) {
      return new Date(year, month - 1, day);
    }
  }

  return null;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center rounded-lg border border-dashed bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}
