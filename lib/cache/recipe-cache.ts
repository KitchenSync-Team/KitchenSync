import { createServiceRoleClient } from "@/lib/supabase/service-role";

const DEFAULT_RECIPE_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

export type RecipeCacheRow = {
  results: unknown;
  expires_at: string | null;
};

export function isRecipeCacheFresh(expiresAt?: string | null) {
  return Boolean(expiresAt && new Date(expiresAt) > new Date());
}

export async function readRecipeCache(cacheKey: string) {
  const admin = createServiceRoleClient();
  return admin
    .from("recipe_cache")
    .select("results, expires_at")
    .eq("cache_key", cacheKey)
    .maybeSingle();
}

export async function writeRecipeCache(
  cacheKey: string,
  results: unknown,
  ttlMs = DEFAULT_RECIPE_CACHE_TTL_MS,
) {
  const admin = createServiceRoleClient();
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();
  return admin.from("recipe_cache").upsert({
    cache_key: cacheKey,
    results,
    expires_at: expiresAt,
  });
}
