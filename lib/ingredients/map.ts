import crypto from "node:crypto";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

const MAP_URL = "https://api.spoonacular.com/food/ingredients/map";

type MapRequestPayload = {
  ingredients: string[];
  servings?: number;
};

export async function mapIngredientsToProducts({ ingredients, servings }: MapRequestPayload) {
  const apiKey = process.env.SPOONACULAR_API_KEY;
  if (!apiKey) throw new Error("Spoonacular API key missing");

  const cacheKey = buildCacheKey(ingredients, servings);

  const admin = createServiceRoleClient();

  const { data: cached, error: cacheError } = await admin
    .from("recipe_cache")
    .select("results, expires_at")
    .eq("cache_key", cacheKey)
    .maybeSingle();

  if (cacheError) {
    console.error("Map cache read error:", cacheError);
  }

  if (cached?.results && cached.expires_at && new Date(cached.expires_at) > new Date()) {
    return { results: cached.results, cached: true };
  }

  const res = await fetch(MAP_URL + `?apiKey=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ingredients,
      servings,
    }),
  });

  const raw = await res.json();
  if (!res.ok) {
    throw new Error(`Spoonacular map error: ${res.status}`);
  }

  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
  const { error: insertError } = await admin
    .from("recipe_cache")
    .upsert({
      cache_key: cacheKey,
      results: raw,
      expires_at: expiresAt,
    });

  if (insertError) {
    console.error("Map cache write error:", insertError);
  }

  return { results: raw, cached: false };
}

function buildCacheKey(ingredients: string[], servings?: number) {
  const norm = ingredients.map((v) => v.trim().toLowerCase()).filter(Boolean).sort();
  return `map:${hashKey(JSON.stringify({ ingredients: norm, servings: servings ?? null }))}`;
}

function hashKey(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
