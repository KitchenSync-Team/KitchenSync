import crypto from "node:crypto";

import { buildSpoonacularUrl, type SpoonacularClient } from "@/lib/spoonacular/client";
import {
  normalizeCuisineFilters,
  normalizeDietFilters,
  normalizeIntoleranceFilters,
} from "@/lib/recipes/spoonacular-filters";

import type { RecipeSearchPayload, RecipeSearchResponse, NormalizedRecipe } from "./types";
import { loadUserRecipeContext } from "./preferences";

type SpoonacularComplexResponse = {
  results?: (Record<string, unknown> & { id: number; title: string; image?: string })[];
  totalResults?: number;
};

type SpoonacularIngredientResponse = (Record<string, unknown> & {
  id: number;
  title: string;
  image?: string;
  likes?: number;
  missedIngredients?: { original?: string; name?: string }[];
  usedIngredients?: { original?: string; name?: string }[];
  missedIngredientCount?: number;
  usedIngredientCount?: number;
})[];

type BuildParamsResult = {
  endpoint: "complexSearch" | "findByIngredients";
  url: string;
  cacheKey: string;
  applied: RecipeSearchResponse["appliedPreferences"];
  headers: Record<string, string>;
  pantryItems: {
    name: string;
    normalizedName: string;
    spoonacularIngredientId: number | null;
    quantity: number;
  }[];
};

const MAX_INCLUDE_INGREDIENTS = 8;

export async function buildRecipeSearch({
  payload,
  userId,
  client,
}: {
  payload: RecipeSearchPayload;
  userId: string;
  client: SpoonacularClient;
}): Promise<BuildParamsResult> {
  const userContext = await loadUserRecipeContext(userId);

  const personalizationSkipped = payload.ignorePreferences === true || !userContext.personalizationOptIn;

  const dietRaw = personalizationSkipped
    ? []
    : payload.applyDiet === false
      ? []
      : payload.diet ?? userContext.dietaryPreferences;
  const diet = normalizeDietFilters(dietRaw);

  const allergensRaw = personalizationSkipped
    ? []
    : payload.applyAllergens === false
      ? []
      : payload.allergens ?? userContext.allergens;
  const allergens = normalizeIntoleranceFilters(allergensRaw);

  const includeCuisinesRaw =
    personalizationSkipped || payload.useCuisineLikes === false
      ? []
      : payload.cuisineLikes ?? userContext.cuisineLikes;
  const includeCuisines = normalizeCuisineFilters(includeCuisinesRaw);

  const excludeCuisinesRaw =
    personalizationSkipped || payload.applyCuisineDislikes === false
      ? []
      : payload.cuisineDislikes ?? userContext.cuisineDislikes;
  const excludeCuisines = normalizeCuisineFilters(excludeCuisinesRaw);
  const hasKeywordQuery = Boolean(payload.query?.trim());
  // Spoonacular cuisine filtering can over-constrain keyword lookups.
  // Keep cuisine filters for broad discovery mode, but not for direct text queries.
  const includeCuisinesApplied = hasKeywordQuery ? [] : includeCuisines;
  const excludeCuisinesApplied = hasKeywordQuery ? [] : excludeCuisines;

  const selectedIngredients = normalizeSearchIngredients(payload.includeIngredients ?? []);
  const pantryIngredients = payload.usePantry
    ? normalizeSearchIngredients(userContext.pantryIngredients)
    : [];

  // Use explicit ingredient selections whenever present.
  // Only fall back to full-kitchen ingredient filtering when running
  // ingredient-only searches (no keyword query), otherwise query searches
  // become unintentionally over-constrained.
  const includeIngredients = (
    selectedIngredients.length > 0
      ? selectedIngredients
      : (!payload.query && payload.usePantry ? pantryIngredients : [])
  ).slice(0, MAX_INCLUDE_INGREDIENTS);

  if (!payload.query && includeIngredients.length === 0) {
    throw new Error("Please provide a keyword or at least one ingredient to search.");
  }

  const params = new URLSearchParams();
  const limit = clamp(payload.number ?? 12, 1, 24);
  params.set("number", String(limit));
  params.set("addRecipeInformation", "true");
  if (!hasKeywordQuery) {
    // Ingredient-only discovery benefits from full ingredient payloads.
    params.set("instructionsRequired", "true");
    params.set("fillIngredients", "true");
  }

  if (payload.maxReadyTime) {
    params.set("maxReadyTime", String(Math.max(1, payload.maxReadyTime)));
  }

  const supportedComplexSort = toComplexSearchSort(payload.sort);
  if (supportedComplexSort) {
    params.set("sort", supportedComplexSort);
  }

  if (!hasKeywordQuery && includeIngredients.length > 0) {
    params.set("includeIngredients", includeIngredients.join(","));
  }

  if (!hasKeywordQuery && diet.length > 0) {
    params.set("diet", diet.join(","));
  }

  if (!hasKeywordQuery && allergens.length > 0) {
    params.set("intolerances", allergens.join(","));
  }

  if (!hasKeywordQuery && includeCuisinesApplied.length > 0) {
    params.set("cuisine", includeCuisinesApplied.join(","));
  }

  if (!hasKeywordQuery && excludeCuisinesApplied.length > 0) {
    params.set("excludeCuisine", excludeCuisinesApplied.join(","));
  }

  const endpoint: BuildParamsResult["endpoint"] = "complexSearch";

  if (payload.query) {
    params.set("query", payload.query.trim());
  }

  const rawCacheKey = JSON.stringify({
    endpoint,
    params: Object.fromEntries(params.entries()),
    personalizationSkipped,
  });

  const cacheKey = `recipes:${hashKey(rawCacheKey)}`;

  const url = buildSpoonacularUrl(client, "/recipes/complexSearch", params);

  return {
    endpoint,
    url,
    cacheKey,
    headers: client.headers,
    pantryItems: userContext.pantryItems,
    applied: {
      diet,
      allergens,
      includeCuisines: hasKeywordQuery ? includeCuisines : includeCuisinesApplied,
      excludeCuisines: hasKeywordQuery ? excludeCuisines : excludeCuisinesApplied,
      personalizationSkipped,
      usedPantryItems: selectedIngredients.length === 0 && !hasKeywordQuery && payload.usePantry
        ? userContext.pantryIngredients
        : [],
    },
  };
}

export function normalizeRecipeResults(
  endpoint: "complexSearch" | "findByIngredients",
  data: unknown,
): { results: NormalizedRecipe[]; totalResults: number } {
  if (endpoint === "findByIngredients") {
    const rows = Array.isArray(data) ? (data as SpoonacularIngredientResponse) : [];
    const results = rows.map((row) => ({
      id: row.id,
      title: row.title,
      image: normalizeImage(row.image),
      aggregateLikes: Number(row.likes ?? 0),
      usedIngredientCount: row.usedIngredientCount ?? row.usedIngredients?.length ?? 0,
      missedIngredientCount: row.missedIngredientCount ?? row.missedIngredients?.length ?? 0,
      usedIngredients: toNormalizedIngredients(row.usedIngredients),
      missedIngredients: toNormalizedIngredients(row.missedIngredients),
      sourceUrl: buildRecipeUrl(row.title, row.id),
    }));
    return { results, totalResults: rows.length };
  }

  const payload = (data ?? {}) as SpoonacularComplexResponse;
  const rows = Array.isArray(payload.results) ? payload.results : [];
  const results = rows.map((row) => ({
    id: row.id,
    title: row.title,
    image: normalizeImage(row.image),
    readyInMinutes: toNullableNumber(row.readyInMinutes),
    aggregateLikes: toNullableNumber(row.aggregateLikes),
    healthScore: toNullableNumber(row.healthScore),
    instructions: typeof (row as { instructions?: unknown }).instructions === "string"
      ? (row as { instructions?: string }).instructions
      : undefined,
    diets: Array.isArray(row.diets)
      ? row.diets.filter((value): value is string => typeof value === "string")
      : [],
    usedIngredients: toNormalizedIngredients((row as { usedIngredients?: unknown }).usedIngredients),
    missedIngredients: toNormalizedIngredients(
      (row as { missedIngredients?: unknown }).missedIngredients,
    ),
    extendedIngredients: toNormalizedIngredients((row as { extendedIngredients?: unknown }).extendedIngredients),
    usedIngredientCount: (row as { usedIngredientCount?: number }).usedIngredientCount,
    missedIngredientCount: (row as { missedIngredientCount?: number }).missedIngredientCount,
    sourceUrl: buildRecipeUrl(row.title, row.id),
  }));

  return {
    results,
    totalResults: typeof payload.totalResults === "number" ? payload.totalResults : results.length,
  };
}

function toNullableNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function normalizeImage(image: unknown): string | null {
  if (typeof image !== "string" || image.length === 0) return null;
  if (image.startsWith("http")) return image;
  return `https://img.spoonacular.com/recipes/${image}`;
}

function buildRecipeUrl(title: string, id: number) {
  const slug = title?.toLowerCase()?.replace(/\s+/g, "-") ?? "recipe";
  return `https://spoonacular.com/recipes/${slug}-${id}`;
}

function toNormalizedIngredients(
  list: unknown,
): { id?: number; name: string; original: string }[] | undefined {
  if (!Array.isArray(list)) return undefined;
  return list
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const id =
        "id" in entry && typeof entry.id === "number" && Number.isFinite(entry.id) ? entry.id : null;
      const name = "name" in entry && typeof entry.name === "string" ? entry.name : null;
      const original =
        "original" in entry && typeof entry.original === "string"
          ? entry.original
          : name ?? null;
      if (!name && !original) return null;
      return {
        ...(id !== null ? { id } : {}),
        name: name ?? original ?? "",
        original: original ?? name ?? "",
      };
    })
    .filter((value): value is { id?: number; name: string; original: string } => Boolean(value));
}

function hashKey(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function toComplexSearchSort(value: string | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "popularity") return "popularity";
  if (normalized === "time") return "time";
  return null;
}

function normalizeSearchIngredients(values: string[]): string[] {
  const deduped = new Set<string>();
  for (const raw of values) {
    const normalized = normalizeIngredientForSearch(raw);
    if (!normalized) continue;
    deduped.add(normalized);
  }
  return Array.from(deduped);
}

function normalizeIngredientForSearch(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return "";

  // Canonicalize common inventory names to Spoonacular-friendly terms.
  if (
    /\b(marinara|pasta sauce|spaghetti sauce|jarred pasta sauce|tomato basil sauce)\b/.test(
      normalized,
    )
  ) {
    return "tomato sauce";
  }

  if (
    /\b(ground chuck|ground sirloin|hamburger|hamburger meat|minced beef)\b/.test(normalized)
  ) {
    return "ground beef";
  }

  if (
    /\b(chicken breast halves|skinless boneless chicken breast halves|chicken breasts)\b/.test(
      normalized,
    )
  ) {
    return "chicken breast";
  }

  if (/\begg whites?\b/.test(normalized)) {
    return "egg white";
  }

  if (/\bpart skim mozzarella\b/.test(normalized)) {
    return "mozzarella";
  }

  if (/\bparmigiano reggiano\b/.test(normalized)) {
    return "parmesan";
  }

  return normalized;
}
