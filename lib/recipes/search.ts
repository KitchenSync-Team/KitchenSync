import crypto from "node:crypto";

import { buildSpoonacularUrl, type SpoonacularClient } from "@/lib/spoonacular/client";

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
};

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

  const diet = personalizationSkipped
    ? []
    : payload.applyDiet === false
      ? []
      : payload.diet ?? userContext.dietaryPreferences;

  const allergens = personalizationSkipped
    ? []
    : payload.applyAllergens === false
      ? []
      : payload.allergens ?? userContext.allergens;

  const includeCuisines =
    personalizationSkipped || payload.useCuisineLikes === false
      ? []
      : payload.cuisineLikes ?? userContext.cuisineLikes;

  const excludeCuisines =
    personalizationSkipped || payload.applyCuisineDislikes === false
      ? []
      : payload.cuisineDislikes ?? userContext.cuisineDislikes;

  const includeIngredients = [
    ...(payload.includeIngredients ?? []),
    ...(payload.usePantry ? userContext.pantryIngredients : []),
  ]
    .map((value) => value.trim())
    .filter(Boolean);

  if (!payload.query && includeIngredients.length === 0) {
    throw new Error("Please provide a keyword or at least one ingredient to search.");
  }

  const params = new URLSearchParams();
  const limit = clamp(payload.number ?? 12, 1, 24);
  params.set("number", String(limit));
  params.set("instructionsRequired", "true");
  params.set("addRecipeInformation", "true");
  params.set("fillIngredients", "true");

  if (payload.maxReadyTime) {
    params.set("maxReadyTime", String(Math.max(1, payload.maxReadyTime)));
  }

  if (payload.sort) {
    params.set("sort", payload.sort);
  }

  if (includeIngredients.length > 0) {
    params.set("includeIngredients", includeIngredients.join(","));
  }

  if (diet.length > 0) {
    params.set("diet", diet.join(","));
  }

  if (allergens.length > 0) {
    params.set("intolerances", allergens.join(","));
  }

  if (includeCuisines.length > 0) {
    params.set("cuisine", includeCuisines.join(","));
  }

  if (excludeCuisines.length > 0) {
    params.set("excludeCuisine", excludeCuisines.join(","));
  }

  let endpoint: BuildParamsResult["endpoint"] = "complexSearch";

  if (!payload.query && includeIngredients.length > 0) {
    endpoint = "findByIngredients";
    params.set("ingredients", includeIngredients.join(","));
    params.delete("includeIngredients");
    // findByIngredients sort values: 1 maximize used, 2 minimize missing
    if (payload.sort === "min-missing-ingredients") {
      params.set("ranking", "2");
    } else {
      params.set("ranking", "1");
    }
  } else if (payload.query) {
    params.set("query", payload.query.trim());
  }

  const rawCacheKey = JSON.stringify({
    endpoint,
    params: Object.fromEntries(params.entries()),
    personalizationSkipped,
  });

  const cacheKey = `recipes:${hashKey(rawCacheKey)}`;

  const url =
    endpoint === "findByIngredients"
      ? buildSpoonacularUrl(client, "/recipes/findByIngredients", params)
      : buildSpoonacularUrl(client, "/recipes/complexSearch", params);

  return {
    endpoint,
    url,
    cacheKey,
    headers: client.headers,
    applied: {
      diet,
      allergens,
      includeCuisines,
      excludeCuisines,
      personalizationSkipped,
      usedPantryItems: payload.usePantry ? userContext.pantryIngredients : [],
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
): { name: string; original: string }[] | undefined {
  if (!Array.isArray(list)) return undefined;
  return list
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const name = "name" in entry && typeof entry.name === "string" ? entry.name : null;
      const original =
        "original" in entry && typeof entry.original === "string"
          ? entry.original
          : name ?? null;
      if (!name && !original) return null;
      return {
        name: name ?? original ?? "",
        original: original ?? name ?? "",
      };
    })
    .filter((value): value is { name: string; original: string } => Boolean(value));
}

function hashKey(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
