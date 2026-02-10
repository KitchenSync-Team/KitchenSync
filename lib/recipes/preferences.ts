import { createServiceRoleClient } from "@/lib/supabase/service-role";

type UserPreferencesRow = {
  default_kitchen_id: string | null;
  dietary_preferences: string[] | null;
  allergens: string[] | null;
  cuisine_likes: string[] | null;
  cuisine_dislikes: string[] | null;
  personalization_opt_in: boolean | null;
};

export type UserRecipeContext = {
  userId: string;
  defaultKitchenId: string | null;
  dietaryPreferences: string[];
  allergens: string[];
  cuisineLikes: string[];
  cuisineDislikes: string[];
  personalizationOptIn: boolean;
  pantryIngredients: string[];
  pantryItems: {
    name: string;
    normalizedName: string;
    spoonacularIngredientId: number | null;
    quantity: number;
  }[];
};

const MAX_PANTRY_INGREDIENTS = 30;

export async function loadUserRecipeContext(userId: string): Promise<UserRecipeContext> {
  const admin = createServiceRoleClient();

  const { data: prefs, error: prefsError } = await admin
    .from("user_preferences")
    .select(
      "default_kitchen_id, dietary_preferences, allergens, cuisine_likes, cuisine_dislikes, personalization_opt_in",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (prefsError) {
    throw prefsError;
  }

  const typedPrefs = (prefs ?? {}) as UserPreferencesRow;

  const dietaryPreferences = Array.isArray(typedPrefs.dietary_preferences)
    ? typedPrefs.dietary_preferences.filter((value): value is string => typeof value === "string")
    : [];

  const allergens = Array.isArray(typedPrefs.allergens)
    ? typedPrefs.allergens.filter((value): value is string => typeof value === "string")
    : [];

  const cuisineLikes = Array.isArray(typedPrefs.cuisine_likes)
    ? typedPrefs.cuisine_likes.filter((value): value is string => typeof value === "string")
    : [];

  const cuisineDislikesRaw = Array.isArray(typedPrefs.cuisine_dislikes)
    ? typedPrefs.cuisine_dislikes.filter((value): value is string => typeof value === "string")
    : [];

  const likesSet = new Set(cuisineLikes);
  const cuisineDislikes = cuisineDislikesRaw.filter((value) => !likesSet.has(value));

  const personalizationOptIn =
    typeof typedPrefs.personalization_opt_in === "boolean"
      ? typedPrefs.personalization_opt_in
      : true;

  // Resolve kitchen id: default from preferences or oldest membership.
  let kitchenId = typedPrefs.default_kitchen_id ?? null;

  if (!kitchenId) {
    const { data: fallbackMembership, error: membershipError } = await admin
      .from("kitchen_members")
      .select("kitchen_id")
      .eq("user_id", userId)
      .order("joined_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (membershipError && membershipError.code !== "42P17") {
      throw membershipError;
    }

    kitchenId = fallbackMembership?.kitchen_id ?? null;
  }

  let pantryIngredients: string[] = [];
  let pantryItems: UserRecipeContext["pantryItems"] = [];

  if (kitchenId) {
    const { data: inventoryRows, error: inventoryError } = await admin
      .from("inventory")
      .select("quantity, items(name, spoonacular_ingredient_id)")
      .eq("kitchen_id", kitchenId)
      .order("created_at", { ascending: false })
      .limit(MAX_PANTRY_INGREDIENTS);

    if (!inventoryError && Array.isArray(inventoryRows)) {
      type PantryRow = {
        quantity?: number | string | null;
        items?: { name?: string | null; spoonacular_ingredient_id?: number | string | null } | unknown[];
      };
      const byKey = new Map<
        string,
        { name: string; normalizedName: string; spoonacularIngredientId: number | null; quantity: number }
      >();

      for (const sourceRow of inventoryRows) {
        const row = sourceRow as PantryRow;
        const item = Array.isArray(row.items) ? row.items[0] ?? row.items : row.items;
        if (!item || typeof item !== "object" || !("name" in item)) continue;
        const rawName = typeof item.name === "string" ? item.name.trim() : "";
        const normalizedName = normalizeIngredientName(rawName);
        if (!normalizedName) continue;
        const rawSpoonId =
          "spoonacular_ingredient_id" in item ? (item.spoonacular_ingredient_id as unknown) : null;
        const spoonacularIngredientId = toNullableInteger(rawSpoonId);
        const quantity = toPositiveNumber(row.quantity) ?? 1;
        const key = spoonacularIngredientId ? `id:${spoonacularIngredientId}` : `name:${normalizedName}`;
        const existing = byKey.get(key);
        if (existing) {
          existing.quantity += quantity;
          continue;
        }
        byKey.set(key, {
          name: rawName,
          normalizedName,
          spoonacularIngredientId,
          quantity,
        });
      }

      pantryItems = Array.from(byKey.values()).slice(0, MAX_PANTRY_INGREDIENTS);
      pantryIngredients = pantryItems
        .map((item) => item.name.trim())
        .filter(Boolean)
        .slice(0, MAX_PANTRY_INGREDIENTS);
    }
  }

  return {
    userId,
    defaultKitchenId: kitchenId,
    dietaryPreferences,
    allergens,
    cuisineLikes,
    cuisineDislikes,
    personalizationOptIn,
    pantryIngredients,
    pantryItems,
  };
}

function normalizeIngredientName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function toNullableInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.trunc(parsed);
  }
  return null;
}

function toPositiveNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
}
