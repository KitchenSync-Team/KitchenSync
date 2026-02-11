import crypto from "node:crypto";

import { buildSpoonacularUrl, type SpoonacularClient } from "@/lib/spoonacular/client";
import { readRecipeCache, writeRecipeCache } from "@/lib/cache/recipe-cache";
import { deriveIngredientDietBadges, normalizeDietFilterKeys } from "@/lib/ingredients/badges";

import type { IngredientSearchResponse, IngredientSearchResult } from "./types";

type SpoonacularIngredientSearch = {
  results?: { id: number; name: string; image?: string; aisle?: string }[];
  totalResults?: number;
};

export async function searchIngredients({
  query,
  limit = 12,
  offset = 0,
  intolerances = [],
  dietFilters = [],
  strictDiet = false,
  client,
}: {
  query: string;
  limit?: number;
  offset?: number;
  intolerances?: string[];
  dietFilters?: string[];
  strictDiet?: boolean;
  client: SpoonacularClient;
}): Promise<{ url: string; cacheKey: string; headers: Record<string, string> }> {
  const params = new URLSearchParams();
  params.set("query", query);
  params.set("number", String(clamp(limit, 1, 25)));
  params.set("offset", String(Math.max(0, offset)));
  params.set("addChildren", "true");

  if (intolerances.length > 0) {
    params.set("intolerances", intolerances.join(","));
  }

  const url = buildSpoonacularUrl(client, "/food/ingredients/search", params);
  const rawCacheKey = JSON.stringify({
    query,
    limit,
    offset,
    intolerances: intolerances.map((value) => value.trim().toLowerCase()).sort(),
    dietFilters: normalizeDietFilterKeys(dietFilters),
    strictDiet,
  });
  const cacheKey = `ingredients:${hashKey(rawCacheKey)}`;

  return { url, cacheKey, headers: client.headers };
}

export function normalizeIngredientSearch(
  data: unknown,
  appliedIntolerances: string[],
  appliedDietFilters: string[] = [],
  strictDiet = false,
  cacheKey?: string,
): IngredientSearchResponse {
  const payload = (data ?? {}) as SpoonacularIngredientSearch;
  const rows = Array.isArray(payload.results) ? payload.results : [];
  const normalizedDietFilters = normalizeDietFilterKeys(appliedDietFilters);

  const resultRows: IngredientSearchResult[] = rows.map((row) => {
    const dietBadges = deriveIngredientDietBadges({ name: row.name, aisle: row.aisle ?? null });
    const dietMatch =
      normalizedDietFilters.length === 0 || normalizedDietFilters.every((token) => dietBadges.includes(token))
        ? "match"
        : "unknown";
    return {
      id: row.id,
      name: row.name,
      image: normalizeImage(row.image),
      aisle: row.aisle ?? null,
      dietBadges,
      dietMatch,
    };
  });

  const sorted = resultRows.sort((a, b) => {
    const scoreA = a.dietMatch === "match" ? 1 : 0;
    const scoreB = b.dietMatch === "match" ? 1 : 0;
    return scoreB - scoreA;
  });

  const results = strictDiet && normalizedDietFilters.length > 0
    ? sorted.filter((row) => row.dietMatch === "match")
    : sorted;

  return {
    results,
    totalResults: typeof payload.totalResults === "number" ? payload.totalResults : results.length,
    cached: false,
    appliedIntolerances,
    appliedDietFilters: normalizedDietFilters,
    strictDiet,
    cacheKey,
  };
}

export async function readIngredientCache(cacheKey: string) {
  const { data, error } = await readRecipeCache(cacheKey);
  return { data, error };
}

export function normalizeCachedIngredients(
  cached: unknown,
  appliedIntolerances: string[],
  appliedDietFilters: string[] = [],
  strictDiet = false,
  cacheKey: string,
): IngredientSearchResponse {
  if (!cached || typeof cached !== "object") {
    return {
      results: [],
      totalResults: 0,
      cached: true,
      appliedIntolerances,
      appliedDietFilters: normalizeDietFilterKeys(appliedDietFilters),
      strictDiet,
      cacheKey,
    };
  }
  const payload = cached as Partial<IngredientSearchResponse>;
  const rows = Array.isArray(payload.results) ? payload.results : [];
  const results = rows
    .map((row) => {
      const entry = row as Partial<IngredientSearchResult>;
      if (typeof entry.id !== "number" || !entry.name) return null;
      const result: IngredientSearchResult = {
        id: entry.id,
        name: entry.name,
        image: normalizeImage(entry.image),
        dietBadges: Array.isArray(entry.dietBadges)
          ? entry.dietBadges.filter((value): value is string => typeof value === "string")
          : [],
        dietMatch: entry.dietMatch === "match" ? "match" : "unknown",
      };
      if (entry.aisle !== undefined) {
        result.aisle = entry.aisle ?? null;
      }
      return result;
    })
    .filter((row): row is IngredientSearchResult => row !== null);
  return {
    results,
    totalResults: typeof payload.totalResults === "number" ? payload.totalResults : 0,
    cached: true,
    appliedIntolerances: appliedIntolerances ?? payload.appliedIntolerances ?? [],
    appliedDietFilters: normalizeDietFilterKeys(
      appliedDietFilters ??
        (Array.isArray(payload.appliedDietFilters)
          ? payload.appliedDietFilters.filter((value): value is string => typeof value === "string")
          : []),
    ),
    strictDiet: strictDiet ?? payload.strictDiet ?? false,
    cacheKey: payload.cacheKey ?? cacheKey,
  };
}

export async function writeIngredientCache(cacheKey: string, payload: IngredientSearchResponse) {
  return writeRecipeCache(cacheKey, payload);
}

function normalizeImage(image: unknown): string | null {
  if (typeof image !== "string" || image.length === 0) return null;
  if (image === "no.jpg") return null;
  if (image.startsWith("http")) return image;
  return `https://img.spoonacular.com/ingredients_250x250/${image}`;
}

function hashKey(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
