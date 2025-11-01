import type { SupabaseClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

type UpcomingInventoryUnitRow = {
  id: string;
  quantity: number | string | null;
  uom: string | null;
  expires_at: string | null;
  items:
    | {
        name: string | null;
        brand: string | null;
      }
    | {
        name: string | null;
        brand: string | null;
      }[]
    | null;
  locations:
    | {
        name: string | null;
      }
    | {
        name: string | null;
      }[]
    | null;
};

type AlertRow = {
  id: string;
  type: string;
  alert_date: string;
  inventory_units:
    | {
        id: string;
        quantity: number | string | null;
        uom: string | null;
        items:
          | {
              name: string | null;
            }
          | {
              name: string | null;
            }[]
          | null;
        locations:
          | {
              name: string | null;
            }
          | {
              name: string | null;
            }[]
          | null;
      }
    | {
        id: string;
        quantity: number | string | null;
        uom: string | null;
        items:
          | {
              name: string | null;
            }
          | {
              name: string | null;
            }[]
          | null;
        locations:
          | {
              name: string | null;
            }
          | {
              name: string | null;
            }[]
          | null;
      }[]
    | null;
};

type KitchenMemberRow = {
  user_id: string;
  role: string;
  joined_at: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
};

function unwrapSingleRelation<T>(relation: T | T[] | null | undefined): T | null {
  if (!relation) return null;
  return Array.isArray(relation) ? relation[0] ?? null : relation;
}

function parseNumber(value: number | string | null | undefined): number {
  if (value == null) return 0;
  const numeric = typeof value === "string" ? Number(value) : value;
  return Number.isNaN(numeric) ? 0 : numeric;
}

type Nullable<T> = T | null;

export class MissingKitchenError extends Error {
  constructor(message = "No kitchen membership found for the current user") {
    super(message);
    this.name = "MissingKitchenError";
  }
}

export type ProfileSummary = {
  id: string;
  firstName: Nullable<string>;
  lastName: Nullable<string>;
  fullName: Nullable<string>;
  email: Nullable<string>;
  avatarUrl: Nullable<string>;
  onboardingComplete: boolean;
  sex: Nullable<string>;
};

export type KitchenMember = {
  userId: string;
  name: Nullable<string>;
  email: Nullable<string>;
  role: string;
  joinedAt: Nullable<string>;
};

export type LocationSummary = {
  id: string;
  name: string;
  isDefault: boolean;
  icon: Nullable<string>;
  totalUnits: number;
};

export type ExpiringUnit = {
  id: string;
  name: string;
  brand: Nullable<string>;
  quantity: number;
  uom: string;
  expiresAt: Nullable<string>;
  location: Nullable<string>;
};

export type AlertSummary = {
  id: string;
  type: "expiring_soon" | "expired";
  alertDate: string;
  itemName: string;
  location: Nullable<string>;
  quantity: number;
  uom: string;
};

export type ReceiptSummary = {
  id: string;
  merchantName: Nullable<string>;
  total: Nullable<number>;
  purchasedAt: Nullable<string>;
  source: Nullable<string>;
};

export type UserPreferencesSummary = {
  dietaryPreferences: string[];
  allergens: string[];
  cuisineLikes: string[];
  cuisineDislikes: string[];
  personalizationOptIn: boolean;
  unitsSystem: "imperial" | "metric";
  locale: string;
  emailOptIn: boolean;
  pushOptIn: boolean;
};

export type DashboardStats = {
  totalItems: number;
  totalUnits: number;
  expiringSoon: number;
  expired: number;
  activeAlerts: number;
};

export type DashboardData = {
  user: ProfileSummary;
  kitchen: {
    id: string;
    name: string;
    updatedAt: Nullable<string>;
    memberCount: number | null;
    members: KitchenMember[] | null;
    locations: LocationSummary[];
  };
  preferences: UserPreferencesSummary;
  stats: DashboardStats;
  upcomingExpirations: ExpiringUnit[];
  activeAlerts: AlertSummary[];
  recentReceipts: ReceiptSummary[];
};

const UPCOMING_WINDOW_DAYS = 7;
const PERSONALIZATION_FALLBACK = true;

function toDateString(date: Date) {
  return date.toISOString().split("T")[0] ?? "";
}

export async function fetchDashboardData(
  supabase: SupabaseClient,
  userId: string,
): Promise<DashboardData> {
  const [{ data: profile, error: profileError }, { data: preferences, error: preferencesError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, first_name, last_name, full_name, email, avatar_url, onboarding_complete, sex",
        )
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("user_preferences")
        .select(
          "default_kitchen_id, dietary_preferences, allergens, cuisine_likes, cuisine_dislikes, personalization_opt_in, units_system, locale, email_opt_in, push_opt_in",
        )
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

  if (profileError) {
    throw profileError;
  }

  if (!profile) {
    throw new Error("Profile record is missing for the current user");
  }

  if (preferencesError) {
    throw preferencesError;
  }

  const dietaryPreferences = Array.isArray(preferences?.dietary_preferences)
    ? (preferences?.dietary_preferences as unknown[])
        .filter((value): value is string => typeof value === "string" && value.length > 0)
        .map((value) => value.trim())
    : [];

  const allergens = Array.isArray(preferences?.allergens)
    ? (preferences?.allergens as unknown[])
        .filter((value): value is string => typeof value === "string" && value.length > 0)
        .map((value) => value.trim())
    : [];
  const cuisineLikes = Array.isArray(preferences?.cuisine_likes)
    ? Array.from(
        new Set(
          (preferences?.cuisine_likes as unknown[])
            .filter((value): value is string => typeof value === "string" && value.length > 0)
            .map((value) => value.trim()),
        ),
      )
    : [];
  const rawCuisineDislikes = Array.isArray(preferences?.cuisine_dislikes)
    ? Array.from(
        new Set(
          (preferences?.cuisine_dislikes as unknown[])
            .filter((value): value is string => typeof value === "string" && value.length > 0)
            .map((value) => value.trim()),
        ),
      )
    : [];
  const cuisineLikesSet = new Set(cuisineLikes);
  const cuisineDislikes = rawCuisineDislikes.filter((value) => !cuisineLikesSet.has(value));

  const personalizationOptIn =
    typeof preferences?.personalization_opt_in === "boolean"
      ? preferences.personalization_opt_in
      : PERSONALIZATION_FALLBACK;

  const allowedUnits = new Set(["imperial", "metric"]);
  const unitsSystem =
    typeof preferences?.units_system === "string" && allowedUnits.has(preferences.units_system)
      ? (preferences.units_system as "imperial" | "metric")
      : "imperial";

  const locale =
    typeof preferences?.locale === "string" && preferences.locale.trim().length > 0
      ? preferences.locale.trim()
      : "en-US";

  const emailOptIn =
    typeof preferences?.email_opt_in === "boolean" ? preferences.email_opt_in : true;

  const pushOptIn =
    typeof preferences?.push_opt_in === "boolean" ? preferences.push_opt_in : false;

  let kitchenId = preferences?.default_kitchen_id ?? null;

  if (!kitchenId) {
    const fallbackMembership = await supabase
      .from("kitchen_members")
      .select("kitchen_id")
      .eq("user_id", userId)
      .order("joined_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (fallbackMembership.error) {
      if (fallbackMembership.error.code !== "42P17") {
        throw fallbackMembership.error;
      }
    } else {
      kitchenId = fallbackMembership.data?.kitchen_id ?? null;
    }
  }

  if (!kitchenId) {
    throw new MissingKitchenError();
  }

  const { data: kitchen, error: kitchenError } = await supabase
    .from("kitchens")
    .select("id, name, updated_at")
    .eq("id", kitchenId)
    .maybeSingle();

  if (kitchenError) {
    throw kitchenError;
  }

  if (!kitchen) {
    throw new Error("Kitchen record could not be loaded");
  }

  const today = new Date();
  const windowEnd = new Date(today);
  windowEnd.setDate(today.getDate() + UPCOMING_WINDOW_DAYS);

  const todayString = toDateString(today);
  const windowEndString = toDateString(windowEnd);

  const [
    itemsCountResult,
    unitsCountResult,
    expiringCountResult,
    expiredCountResult,
    locationsResult,
    locationUnitIdsResult,
    upcomingUnitsResult,
    alertsResult,
    receiptsResult,
  ] = await Promise.all([
    supabase
      .from("items")
      .select("id", { count: "exact", head: true })
      .eq("kitchen_id", kitchenId)
      .eq("is_archived", false),
    supabase
      .from("inventory_units")
      .select("id", { count: "exact", head: true })
      .eq("kitchen_id", kitchenId),
    supabase
      .from("inventory_units")
      .select("id", { count: "exact", head: true })
      .eq("kitchen_id", kitchenId)
      .not("expires_at", "is", null)
      .gte("expires_at", todayString)
      .lte("expires_at", windowEndString),
    supabase
      .from("inventory_units")
      .select("id", { count: "exact", head: true })
      .eq("kitchen_id", kitchenId)
      .not("expires_at", "is", null)
      .lt("expires_at", todayString),
    supabase
      .from("locations")
      .select("id, name, icon, is_default, sort_order")
      .eq("kitchen_id", kitchenId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("inventory_units")
      .select("location_id")
      .eq("kitchen_id", kitchenId),
    supabase
      .from("inventory_units")
      .select(
        "id, quantity, uom, expires_at, items(name, brand), locations(name)",
      )
      .eq("kitchen_id", kitchenId)
      .not("expires_at", "is", null)
      .gte("expires_at", todayString)
      .lte("expires_at", windowEndString)
      .order("expires_at", { ascending: true })
      .limit(6),
    supabase
      .from("alerts")
      .select(
        "id, type, alert_date, inventory_units(id, quantity, uom, items(name), locations(name))",
      )
      .eq("kitchen_id", kitchenId)
      .eq("acknowledged", false)
      .order("alert_date", { ascending: true })
      .limit(6),
    supabase
      .from("receipts")
      .select("id, merchant_name, total, purchased_at, source")
      .eq("kitchen_id", kitchenId)
      .order("purchased_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  if (itemsCountResult.error) throw itemsCountResult.error;
  if (unitsCountResult.error) throw unitsCountResult.error;
  if (expiringCountResult.error) throw expiringCountResult.error;
  if (expiredCountResult.error) throw expiredCountResult.error;
  if (locationsResult.error) throw locationsResult.error;
  if (locationUnitIdsResult.error) throw locationUnitIdsResult.error;
  if (upcomingUnitsResult.error) throw upcomingUnitsResult.error;
  if (alertsResult.error) throw alertsResult.error;
  if (receiptsResult.error) throw receiptsResult.error;

  const locationCounts = new Map<string, number>();
  for (const unit of locationUnitIdsResult.data ?? []) {
    const key = unit.location_id ?? "__unassigned";
    locationCounts.set(key, (locationCounts.get(key) ?? 0) + 1);
  }

  const locationSummaries: LocationSummary[] = (locationsResult.data ?? []).map((location) => ({
    id: location.id,
    name: location.name,
    isDefault: Boolean(location.is_default),
    icon: location.icon ?? null,
    totalUnits: locationCounts.get(location.id) ?? 0,
  }));

  const unassignedUnits = locationCounts.get("__unassigned") ?? 0;
  if (unassignedUnits > 0) {
    locationSummaries.push({
      id: "__unassigned",
      name: "Unassigned",
      isDefault: false,
      icon: null,
      totalUnits: unassignedUnits,
    });
  }

  const upcomingUnitsData = (upcomingUnitsResult.data ?? []) as UpcomingInventoryUnitRow[];
  const upcomingExpirations: ExpiringUnit[] = upcomingUnitsData.map((unit) => {
    const item = unwrapSingleRelation(unit.items);
    const location = unwrapSingleRelation(unit.locations);

    return {
      id: unit.id,
      name: item?.name ?? "Unnamed item",
      brand: item?.brand ?? null,
      quantity: parseNumber(unit.quantity),
      uom: unit.uom ?? "each",
      expiresAt: unit.expires_at ?? null,
      location: location?.name ?? null,
    } satisfies ExpiringUnit;
  });

  const alertsData = (alertsResult.data ?? []) as AlertRow[];
  const activeAlerts: AlertSummary[] = alertsData.map((alert) => {
    const relatedUnitRaw = unwrapSingleRelation(alert.inventory_units);
    const relatedUnit = relatedUnitRaw ?? null;
    const item = unwrapSingleRelation(relatedUnit?.items);
    const location = unwrapSingleRelation(relatedUnit?.locations);

    return {
      id: alert.id,
      type: alert.type === "expired" ? "expired" : "expiring_soon",
      alertDate: alert.alert_date,
      itemName: item?.name ?? "Unnamed item",
      location: location?.name ?? null,
      quantity: parseNumber(relatedUnit?.quantity),
      uom: relatedUnit?.uom ?? "each",
    } satisfies AlertSummary;
  });

  const recentReceipts: ReceiptSummary[] = (receiptsResult.data ?? []).map(
    (receipt) => ({
      id: receipt.id,
      merchantName: receipt.merchant_name ?? receipt.source ?? null,
      total: receipt.total ?? null,
      purchasedAt: receipt.purchased_at ?? null,
      source: receipt.source ?? null,
    }),
  );

  let members: KitchenMember[] | null = null;
  let memberCount: number | null = null;

  const admin = createServiceRoleClient();
  const { data: roster, error: rosterError } = await admin
    .from("kitchen_members")
    .select("user_id, role, joined_at")
    .eq("kitchen_id", kitchenId)
    .order("role", { ascending: true })
    .order("joined_at", { ascending: true });

  if (rosterError) {
    const code = (rosterError as { code?: string }).code;
    if (code && code !== "42P17") {
      throw rosterError;
    }
    if (!code && !rosterError.message.includes("service role credentials")) {
      throw rosterError;
    }
    members = null;
    memberCount = null;
  } else {
    const rosterData = (roster ?? []) as KitchenMemberRow[];
    const userIds = rosterData.map((entry) => entry.user_id);
    memberCount = userIds.length;

    if (userIds.length > 0) {
      const { data: profileRows, error: profileError } = await admin
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      if (profileError) {
        const profileCode = (profileError as { code?: string }).code;
        if (profileCode && profileCode !== "42P17") {
          throw profileError;
        }
        if (!profileCode && !profileError.message.includes("service role credentials")) {
          throw profileError;
        }
        members = null;
        memberCount = null;
      } else {
        const profileRowsData = (profileRows ?? []) as ProfileRow[];
        const profileMap = new Map(
          profileRowsData.map((row) => [row.id, row] as const),
        );

        members = rosterData.map((entry) => {
          const profileRow = profileMap.get(entry.user_id ?? "");
          return {
            userId: entry.user_id,
            role: entry.role,
            joinedAt: entry.joined_at ?? null,
            name: profileRow?.full_name ?? null,
            email: profileRow?.email ?? null,
          } satisfies KitchenMember;
        });
      }
    } else {
      members = [];
    }
  }

  const derivedFullName = [profile.first_name, profile.last_name]
    .filter((value): value is string => Boolean(value && value.trim()))
    .join(" ");

  return {
    user: {
      id: profile.id,
      firstName: profile.first_name ?? null,
      lastName: profile.last_name ?? null,
      fullName:
        profile.full_name ??
        (derivedFullName.length > 0 ? derivedFullName : null),
      email: profile.email ?? null,
      avatarUrl: profile.avatar_url ?? null,
      onboardingComplete: Boolean(profile.onboarding_complete),
      sex: profile.sex ?? null,
    },
    kitchen: {
      id: kitchen.id,
      name: kitchen.name,
      updatedAt: kitchen.updated_at ?? null,
      memberCount,
      members,
      locations: locationSummaries,
    },
    preferences: {
      dietaryPreferences,
      allergens,
      cuisineLikes,
      cuisineDislikes,
      personalizationOptIn,
      unitsSystem,
      locale,
      emailOptIn,
      pushOptIn,
    },
    stats: {
      totalItems: itemsCountResult.count ?? 0,
      totalUnits: unitsCountResult.count ?? 0,
      expiringSoon: expiringCountResult.count ?? 0,
      expired: expiredCountResult.count ?? 0,
      activeAlerts: activeAlerts.length,
    },
    upcomingExpirations,
    activeAlerts,
    recentReceipts,
  };
}
