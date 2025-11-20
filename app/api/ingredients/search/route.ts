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
import { createClient } from "@/lib/supabase/server";

const API_KEY = process.env.SPOONACULAR_API_KEY;

export async function POST(req: NextRequest) {
  try {
    if (!API_KEY) {
      return NextResponse.json({ error: "Spoonacular API key missing" }, { status: 500 });
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

    const { url, cacheKey } = await searchIngredients({
      query,
      apiKey: API_KEY,
      limit: number,
      intolerances,
    });

    const { data: cacheHit, error: cacheError } = await readIngredientCache(cacheKey);

    if (cacheError) {
      console.error("Ingredient cache read error", cacheError);
    }

    if (cacheHit?.results && cacheHit.expires_at && new Date(cacheHit.expires_at) > new Date()) {
      const cachedPayload = normalizeCachedIngredients(cacheHit.results, intolerances, cacheKey);
      return NextResponse.json(cachedPayload);
    }

    const apiRes = await fetch(url);
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
