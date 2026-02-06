import crypto from "node:crypto";

import { buildSpoonacularUrl, getSpoonacularClient } from "@/lib/spoonacular/client";
import { spoonacularFetch } from "@/lib/spoonacular/fetch";
import { isRecipeCacheFresh, readRecipeCache, writeRecipeCache } from "@/lib/cache/recipe-cache";

type MapRequestPayload = {
  ingredients: string[];
  servings?: number;
};

export async function mapIngredientsToProducts({ ingredients, servings }: MapRequestPayload) {
  const client = getSpoonacularClient();

  const cacheKey = buildCacheKey(ingredients, servings);

  const { data: cached, error: cacheError } = await readRecipeCache(cacheKey);

  if (cacheError) {
    console.error("Map cache read error:", cacheError);
  }

  if (cached?.results && isRecipeCacheFresh(cached.expires_at)) {
    return { results: cached.results, cached: true };
  }

  const url = buildSpoonacularUrl(client, "/food/ingredients/map");
  const res = await spoonacularFetch(url, {
    method: "POST",
    headers: { ...client.headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      ingredients,
      servings,
    }),
  });

  const raw = await res.json();
  if (!res.ok) {
    throw new Error(`Spoonacular map error: ${res.status}`);
  }

  const { error: insertError } = await writeRecipeCache(cacheKey, raw);

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
