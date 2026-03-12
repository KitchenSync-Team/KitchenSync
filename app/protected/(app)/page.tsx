import Link from "next/link";
import {
  AlertTriangle,
  ChefHat,
  Clock,
  Plus,
  Settings2,
  ShoppingBasket,
  Tag,
} from "lucide-react";
import { differenceInCalendarDays, parseISO } from "date-fns";

import { createClient } from "@/lib/supabase/server";
import { resolveKitchen } from "@/app/protected/_lib/resolve-kitchen";
import type { AlertSummary, ExpiringUnit } from "@/lib/domain/kitchen";
import { formatInventoryItemName, formatQuantityWithUnit } from "@/lib/formatting/inventory";
import { LocationDonutChart } from "./_components/location-donut-chart";
import { ExpiredItemsPanel } from "./_components/expired-items-panel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// ─── helpers ────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getDaysUntilExpiry(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  return differenceInCalendarDays(parseISO(expiresAt), new Date());
}

function expiryLabel(days: number | null): string {
  if (days === null) return "No date";
  if (days < 0) return `Expired ${Math.abs(days)} ${Math.abs(days) === 1 ? "day" : "days"} ago`;
  if (days === 0) return "Expires today";
  if (days === 1) return "Expires tomorrow";
  return `Expires in ${days} days`;
}

/** Returns a tailwind bg class for the progress indicator based on urgency. */
function expiryProgressColor(days: number | null): string {
  if (days === null) return "bg-muted-foreground/40";
  if (days <= 0) return "bg-destructive";
  if (days <= 2) return "bg-amber-500";
  return "bg-emerald-500";
}

/** 0–100 fill value: 0 days left = full (urgent), 7 days left = empty (fresh) */
function expiryProgress(days: number | null): number {
  if (days === null) return 0;
  if (days <= 0) return 100;
  return Math.max(0, Math.min(100, ((7 - days) / 7) * 100));
}

// ─── Proposal 1: Icon stat card ──────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  iconClass,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <span className={`shrink-0 rounded-xl p-3 ${iconClass}`}>
          <Icon className="size-7" />
        </span>
        <div className="text-right">
          <p className="text-4xl font-bold tabular-nums leading-none">{value}</p>
          <p className="mt-1.5 text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Proposal 3: Expiring item row with progress bar ─────────────────────────

function ExpiringItemRow({ item }: { item: ExpiringUnit }) {
  const days = getDaysUntilExpiry(item.expiresAt);
  const pct = expiryProgress(days);
  const color = expiryProgressColor(days);

  return (
    <li className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {formatInventoryItemName(item.name)}
          </p>
          <p className="text-xs text-muted-foreground">
            {item.location ?? "No location"} · {formatQuantityWithUnit(item.quantity, item.uom)}
          </p>
        </div>
        <Badge
          className={`shrink-0 text-xs pointer-events-none ${
            days !== null && days <= 0
              ? "border-transparent bg-destructive text-destructive-foreground"
              : days !== null && days <= 2
                ? "border-transparent bg-amber-500 text-white"
                : "border-transparent bg-emerald-500 text-white dark:bg-emerald-500/80"
          }`}
        >
          {expiryLabel(days)}
        </Badge>
      </div>
      {/* Progress bar */}
      <div
        className="relative h-1.5 w-full overflow-hidden rounded-full"
        style={{
          backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(128,128,128,0.15) 3px, rgba(128,128,128,0.15) 6px)",
        }}
      >
        {/* Yellow striped warning zone — last ~14% (≤1 day) */}
        <div
          className="absolute top-0 h-full"
          style={{
            left: `${(6 / 7) * 100}%`,
            right: 0,
            backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(234,179,8,0.55) 3px, rgba(234,179,8,0.55) 6px)",
          }}
        />
        {/* Fill bar — renders on top of warning zone */}
        <div
          className={`relative h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </li>
  );
}

// ─── Proposal 4: Alert row ───────────────────────────────────────────────────

function AlertRow({ alert }: { alert: AlertSummary }) {
  const isExpired = alert.type === "expired";
  return (
    <Alert variant={isExpired ? "destructive" : "default"} className="py-3">
      {isExpired ? (
        <AlertTriangle className="size-4" />
      ) : (
        <Clock className="size-4" />
      )}
      <AlertTitle className="text-sm">
        {formatInventoryItemName(alert.itemName)} · {isExpired ? "Expired" : "Expiring soon"}
      </AlertTitle>
      <AlertDescription className="text-xs">
        {alert.location ?? "No location"} · {formatQuantityWithUnit(alert.quantity, alert.uom)}
      </AlertDescription>
    </Alert>
  );
}

// ─── page ────────────────────────────────────────────────────────────────────

export default async function ProtectedOverviewPage() {
  const [snapshot, supabase] = await Promise.all([resolveKitchen(), createClient()]);
  const { user, kitchen, stats, upcomingExpirations, activeAlerts } = snapshot;

  const today = new Date().toISOString().split("T")[0]!;
  const { data: expiredRaw } = await supabase
    .from("inventory")
    .select("id, quantity, expires_at, items(name, brand), locations(name), units(name, abbreviation)")
    .eq("kitchen_id", kitchen.id)
    .not("expires_at", "is", null)
    .lt("expires_at", today)
    .order("expires_at", { ascending: false });

  type RawRow = {
    id: string;
    quantity: number | string | null;
    expires_at: string | null;
    items: { name: string | null; brand: string | null } | { name: string | null; brand: string | null }[] | null;
    locations: { name: string | null } | { name: string | null }[] | null;
    units: { name: string | null; abbreviation: string | null } | { name: string | null; abbreviation: string | null }[] | null;
  };

  function unwrap<T>(val: T | T[] | null | undefined): T | null {
    if (!val) return null;
    return Array.isArray(val) ? (val[0] ?? null) : val;
  }

  const expiredItems: ExpiringUnit[] = (expiredRaw ?? []).map((row) => {
    const r = row as unknown as RawRow;
    const item = unwrap(r.items);
    const location = unwrap(r.locations);
    const unit = unwrap(r.units);
    return {
      id: r.id,
      name: item?.name ?? "Unnamed item",
      brand: item?.brand ?? null,
      quantity: Number(r.quantity ?? 0),
      uom: unit?.abbreviation?.trim() ?? unit?.name?.trim() ?? "each",
      expiresAt: r.expires_at ?? null,
      location: location?.name ?? null,
    };
  });

  const firstName = user.firstName ?? user.fullName?.split(" ")[0] ?? null;

  return (
    <div className="space-y-6">

      {/* Your Kitchen at a Glance */}
      <div className="space-y-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {getGreeting()}{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="mt-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">At a Glance</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Unique Items in Kitchen"
            value={stats.totalItems}
            icon={Tag}
            iconClass="bg-blue-500 text-white dark:bg-blue-500/80"
          />
          <StatCard
            label="Total Items in Kitchen"
            value={stats.totalUnits}
            icon={ShoppingBasket}
            iconClass="bg-violet-500 text-white dark:bg-violet-500/80"
          />
          <StatCard
            label="Items Expiring Soon"
            value={stats.expiringSoon}
            icon={Clock}
            iconClass="bg-amber-500 text-white dark:bg-amber-500/80"
          />
          <StatCard
            label="Items Expired"
            value={stats.expired}
            icon={AlertTriangle}
            iconClass="bg-red-500 text-white dark:bg-red-500/80"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border bg-muted p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Button variant="outline" className="h-auto justify-start gap-3 bg-card py-3 dark:border-white/20" asChild>
            <Link href="/protected/inventory?add=true">
              <span className="rounded-md bg-blue-500 p-1.5 text-white dark:bg-blue-500/80">
                <Plus className="size-4" />
              </span>
              <div className="text-left">
                <p className="text-sm font-medium">Add Item</p>
                <p className="text-xs text-muted-foreground">Add to your inventory</p>
              </div>
            </Link>
          </Button>

          <Button variant="outline" className="h-auto justify-start gap-3 bg-card py-3 dark:border-white/20" asChild>
            <Link href="/protected/recipes">
              <span className="rounded-md bg-emerald-500 p-1.5 text-white dark:bg-emerald-500/80">
                <ChefHat className="size-4" />
              </span>
              <div className="text-left">
                <p className="text-sm font-medium">Browse Recipes</p>
                <p className="text-xs text-muted-foreground">Use what&apos;s expiring</p>
              </div>
            </Link>
          </Button>

          <Button variant="outline" className="h-auto justify-start gap-3 bg-card py-3 dark:border-white/20" asChild>
            <Link href="/protected/kitchen-settings">
              <span className="rounded-md bg-violet-500 p-1.5 text-white dark:bg-violet-500/80">
                <Settings2 className="size-4" />
              </span>
              <div className="text-left">
                <p className="text-sm font-medium">Kitchen Settings</p>
                <p className="text-xs text-muted-foreground">Members &amp; locations</p>
              </div>
            </Link>
          </Button>
        </div>
      </div>

      {/* Kitchen Stats */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Kitchen Stats</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="flex h-[540px] flex-col">
          <CardHeader>
            <CardTitle>Expiring Soon</CardTitle>
            <CardDescription>Items expiring in the next 7 days</CardDescription>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col">
            {upcomingExpirations.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Nothing expiring in the next 7 days 🎉
              </p>
            ) : (
              <ScrollArea className="flex-1 min-h-0 pr-3">
                <ul className="space-y-4">
                  {upcomingExpirations.map((item) => (
                    <ExpiringItemRow key={item.id} item={item} />
                  ))}
                </ul>
              </ScrollArea>
            )}
          </CardContent>
          <CardFooter>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/protected/inventory">View all inventory →</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="flex h-[540px] flex-col">
          <CardHeader>
            <CardTitle>Expired Items</CardTitle>
            <CardDescription>Items that need to be removed</CardDescription>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col">
            <ExpiredItemsPanel initialItems={expiredItems} />
          </CardContent>
        </Card>

        <Card className="flex h-[540px] flex-col">
          <CardHeader>
            <CardTitle>Storage Locations</CardTitle>
            <CardDescription>Items by location</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <LocationDonutChart locations={kitchen.locations} />
          </CardContent>
          <CardFooter>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/protected/kitchen-settings">Manage locations →</Link>
            </Button>
          </CardFooter>
        </Card>
        </div>
      </div>

      {/* Active alerts */}
      {activeAlerts.length > 0 && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-destructive" />
              Active Alerts
            </CardTitle>
            <CardDescription>
              {activeAlerts.length} unacknowledged alert{activeAlerts.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeAlerts.map((alert) => (
              <AlertRow key={alert.id} alert={alert} />
            ))}
          </CardContent>
          <CardFooter>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/protected/inventory">Manage inventory →</Link>
            </Button>
          </CardFooter>
        </Card>
      )}


    </div>
  );
}
