import crypto from "node:crypto";

import { buildSpoonacularUrl, type SpoonacularClient } from "@/lib/spoonacular/client";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type SpoonacularProductSearch = {
  products?: { id: number; title: string; imageType?: string }[];
  totalProducts?: number;
};

export type GrocerySearchResult = {
  id: number;
  title: string;
  image: string | null;
};

export type GrocerySearchResponse = {
  results: GrocerySearchResult[];
  totalResults: number;
  cached: boolean;
  cacheKey?: string;
};

export function buildGrocerySearch({
  query,
  number = 12,
  client,
}: {
  query: string;
  number?: number;
  client: SpoonacularClient;
}) {
  const params = new URLSearchParams();
  params.set("query", query);
  params.set("number", String(clamp(number, 1, 24)));

  const url = buildSpoonacularUrl(client, "/food/products/search", params);
  const rawCacheKey = JSON.stringify({ query, number });
  const cacheKey = `groceries:${hashKey(rawCacheKey)}`;
  return { url, cacheKey, headers: client.headers };
}

export function normalizeGrocerySearch(data: unknown, cacheKey?: string): GrocerySearchResponse {
  const payload = (data ?? {}) as SpoonacularProductSearch;
  const rows = Array.isArray(payload.products) ? payload.products : [];
  const results: GrocerySearchResult[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    image: normalizeImage(row.id, row.imageType),
  }));
  return {
    results,
    totalResults: typeof payload.totalProducts === "number" ? payload.totalProducts : results.length,
    cached: false,
    cacheKey,
  };
}

export async function readGroceryCache(cacheKey: string) {
  const admin = createServiceRoleClient();
  return admin
    .from("recipe_cache")
    .select("results, expires_at")
    .eq("cache_key", cacheKey)
    .maybeSingle();
}

export function normalizeCachedGroceries(
  cached: unknown,
  cacheKey: string,
): GrocerySearchResponse {
  if (!cached || typeof cached !== "object") {
    return { results: [], totalResults: 0, cached: true, cacheKey };
  }
  const payload = cached as Partial<GrocerySearchResponse>;
  return {
    results: Array.isArray(payload.results) ? payload.results : [],
    totalResults: typeof payload.totalResults === "number" ? payload.totalResults : 0,
    cached: true,
    cacheKey: payload.cacheKey ?? cacheKey,
  };
}

export async function writeGroceryCache(cacheKey: string, payload: GrocerySearchResponse) {
  const admin = createServiceRoleClient();
  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
  return admin.from("recipe_cache").upsert({
    cache_key: cacheKey,
    results: payload,
    expires_at: expiresAt,
  });
}

function normalizeImage(id: number, imageType?: string): string | null {
  if (!imageType) return null;
  return `https://img.spoonacular.com/products/${id}-312x231.${imageType}`;
}

function hashKey(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
