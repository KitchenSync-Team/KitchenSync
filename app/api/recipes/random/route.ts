import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { normalizeRecipeResults } from "@/lib/recipes/search";
import { attachIngredientMatch, sortRecipesByPantryMatch } from "@/lib/recipes/matching";
import { loadUserRecipeContext } from "@/lib/recipes/preferences";
import {
  normalizeCuisineFilters,
  normalizeDietFilters,
  normalizeIntoleranceFilters,
  parseCsvParam,
} from "@/lib/recipes/spoonacular-filters";
import { spoonacularFetch } from "@/lib/spoonacular/fetch";
import { createClient } from "@/lib/supabase/server";
import { buildSpoonacularUrl, getSpoonacularClient } from "@/lib/spoonacular/client";

export async function GET(req: NextRequest) {
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
    const userContext = await loadUserRecipeContext(user.id);

    const urlParams = new URLSearchParams(req.nextUrl.searchParams);
    const number = Math.min(12, Math.max(1, Number(urlParams.get("number") ?? 6)));

    const diets = normalizeDietFilters(parseCsvParam(urlParams.get("diet")));
    const intolerances = normalizeIntoleranceFilters(parseCsvParam(urlParams.get("intolerances")));
    const cuisines = normalizeCuisineFilters(parseCsvParam(urlParams.get("cuisine")));
    const excludeCuisines = normalizeCuisineFilters(parseCsvParam(urlParams.get("excludeCuisine")));

    const useComplex =
      diets.length > 0 ||
      intolerances.length > 0 ||
      cuisines.length > 0 ||
      excludeCuisines.length > 0;

    if (useComplex) {
      const params = new URLSearchParams();
      params.set("number", String(number));
      params.set("sort", "random");
      params.set("addRecipeInformation", "true");
      params.set("fillIngredients", "true");
      if (diets.length > 0) params.set("diet", diets.join(","));
      if (intolerances.length > 0) params.set("intolerances", intolerances.join(","));
      if (cuisines.length > 0) params.set("cuisine", cuisines.join(","));
      if (excludeCuisines.length > 0) params.set("excludeCuisine", excludeCuisines.join(","));

      const url = buildSpoonacularUrl(client, "/recipes/complexSearch", params);
      const res = await spoonacularFetch(url, { headers: client.headers });
      const raw = await res.json();

      if (!res.ok) {
        return NextResponse.json({ error: "Spoonacular error", detail: raw }, { status: res.status });
      }

      const { results, totalResults } = normalizeRecipeResults("complexSearch", raw);

      const matched = attachIngredientMatch(results, userContext.pantryItems);
      return NextResponse.json({
        results: sortRecipesByPantryMatch(matched),
        totalResults,
        cached: false,
      });
    }

    const params = new URLSearchParams();
    params.set("number", String(number));

    const url = buildSpoonacularUrl(client, "/recipes/random", params);

    const res = await spoonacularFetch(url, { headers: client.headers });
    const raw = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: "Spoonacular error", detail: raw }, { status: res.status });
    }

    const recipes = Array.isArray((raw as { recipes?: unknown }).recipes)
      ? ((raw as { recipes?: unknown }).recipes as unknown[])
      : [];

    const { results } = normalizeRecipeResults("complexSearch", {
      results: recipes,
      totalResults: recipes.length,
    });

    const matched = attachIngredientMatch(results, userContext.pantryItems);
    return NextResponse.json({
      results: sortRecipesByPantryMatch(matched),
      totalResults: results.length,
      cached: false,
    });
  } catch (err) {
    console.error("Random recipes error:", err);
    const detail = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "Server error", detail }, { status: 500 });
  }
}
