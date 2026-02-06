import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  normalizeCachedIngredients,
  normalizeIngredientSearch,
  readIngredientCache,
  searchIngredients,
  writeIngredientCache,
} from "@/lib/ingredients/search";
import type { IngredientSearchResponse } from "@/lib/ingredients/types";
import { loadUserRecipeContext } from "@/lib/recipes/preferences";
import { isRecipeCacheFresh } from "@/lib/cache/recipe-cache";
import { spoonacularFetch } from "@/lib/spoonacular/fetch";
import { createClient } from "@/lib/supabase/server";
import { getSpoonacularClient } from "@/lib/spoonacular/client";

export async function POST(req: NextRequest) {
  try {
    let client;
    try {
      client = getSpoonacularClient();
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Spoonacular API key missing";
      return NextResponse.json({ error: "Spoonacular API key missing", detail }, { status: 500 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const query = typeof body.query === "string" ? body.query.trim() : "";
    const number = typeof body.number === "number" ? body.number : undefined;

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const userContext = await loadUserRecipeContext(user.id);
    const intolerances = Array.isArray(body.intolerances)
      ? body.intolerances.filter((value): value is string => typeof value === "string")
      : userContext.allergens;

    const { url, cacheKey, headers } = await searchIngredients({
      query,
      client,
      limit: number,
      intolerances,
    });

    const { data: cacheHit, error: cacheError } = await readIngredientCache(cacheKey);

    if (cacheError) {
      console.error("Ingredient cache read error", cacheError);
    }

    if (cacheHit?.results && isRecipeCacheFresh(cacheHit.expires_at)) {
      const cachedPayload = normalizeCachedIngredients(cacheHit.results, intolerances, cacheKey);
      return NextResponse.json(cachedPayload);
    }

    const apiRes = await spoonacularFetch(url, { headers });
    const raw = await apiRes.json();

    if (!apiRes.ok) {
      return NextResponse.json({ error: "Spoonacular error", detail: raw }, { status: apiRes.status });
    }

    const normalized = normalizeIngredientSearch(raw, intolerances, cacheKey);
    const payload: IngredientSearchResponse = { ...normalized, cached: false };

    const { error: insertError } = await writeIngredientCache(cacheKey, payload);
    if (insertError) {
      console.error("Ingredient cache insert error", insertError);
    }

    return NextResponse.json(payload);
  } catch (err) {
    console.error("Ingredient search error:", err);
    const detail = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "Server error", detail }, { status: 500 });
  }
}
