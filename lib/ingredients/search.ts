import crypto from "node:crypto";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

import type { IngredientSearchResponse, IngredientSearchResult } from "./types";

type SpoonacularIngredientSearch = {
  results?: { id: number; name: string; image?: string; aisle?: string }[];
  totalResults?: number;
};

const BASE_URL = "https://api.spoonacular.com/food/ingredients/search";

export async function searchIngredients({
  query,
  limit = 12,
  intolerances = [],
  apiKey,
}: {
  query: string;
  limit?: number;
  intolerances?: string[];
  apiKey: string;
}): Promise<{ url: string; cacheKey: string }> {
  const params = new URLSearchParams();
  params.set("query", query);
  params.set("number", String(clamp(limit, 1, 25)));
  params.set("addChildren", "true");

  if (intolerances.length > 0) {
    params.set("intolerances", intolerances.join(","));
  }

  const url = `${BASE_URL}?${params.toString()}&apiKey=${apiKey}`;
  const rawCacheKey = JSON.stringify({ query, limit, intolerances });
  const cacheKey = `ingredients:${hashKey(rawCacheKey)}`;

  return { url, cacheKey };
}

export function normalizeIngredientSearch(
  data: unknown,
  appliedIntolerances: string[],
  cacheKey?: string,
): IngredientSearchResponse {
  const payload = (data ?? {}) as SpoonacularIngredientSearch;
  const rows = Array.isArray(payload.results) ? payload.results : [];
  const results: IngredientSearchResult[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    image: normalizeImage(row.image),
    aisle: row.aisle ?? null,
  }));

  return {
    results,
    totalResults: typeof payload.totalResults === "number" ? payload.totalResults : results.length,
    cached: false,
    appliedIntolerances,
    cacheKey,
  };
}

export async function readIngredientCache(cacheKey: string) {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("recipe_cache")
    .select("results, expires_at")
    .eq("cache_key", cacheKey)
    .maybeSingle();
  return { data, error };
}

export function normalizeCachedIngredients(
  cached: unknown,
  appliedIntolerances: string[],
  cacheKey: string,
): IngredientSearchResponse {
  if (!cached || typeof cached !== "object") {
    return {
      results: [],
      totalResults: 0,
      cached: true,
      appliedIntolerances,
      cacheKey,
    };
  }
  const payload = cached as Partial<IngredientSearchResponse>;
  return {
    results: Array.isArray(payload.results) ? payload.results : [],
    totalResults: typeof payload.totalResults === "number" ? payload.totalResults : 0,
    cached: true,
    appliedIntolerances: appliedIntolerances ?? payload.appliedIntolerances ?? [],
    cacheKey: payload.cacheKey ?? cacheKey,
  };
}

export async function writeIngredientCache(cacheKey: string, payload: IngredientSearchResponse) {
  const admin = createServiceRoleClient();
  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
  return admin.from("recipe_cache").upsert({
    cache_key: cacheKey,
    results: payload,
    expires_at: expiresAt,
  });
}

function normalizeImage(image: unknown): string | null {
  if (typeof image !== "string" || image.length === 0) return null;
  if (image.startsWith("http")) return image;
  return `https://img.spoonacular.com/ingredients_250x250/${image}`;
}

function hashKey(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
