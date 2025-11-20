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

  if (kitchenId) {
    const { data: inventoryRows, error: inventoryError } = await admin
      .from("inventory")
      .select("items(name)")
      .eq("kitchen_id", kitchenId)
      .order("created_at", { ascending: false })
      .limit(MAX_PANTRY_INGREDIENTS);

    if (!inventoryError && Array.isArray(inventoryRows)) {
      pantryIngredients = inventoryRows
        .map((row) => {
          const item = Array.isArray(row.items) ? row.items[0] ?? row.items : row.items;
          if (item && typeof item === "object" && "name" in item) {
            const value = (item as { name: unknown }).name;
            return typeof value === "string" ? value : null;
          }
          return null;
        })
        .filter((value): value is string => Boolean(value))
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
  };
}
