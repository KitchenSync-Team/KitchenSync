import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getCacheValue, setCacheValue } from "@/lib/cache/memory";
import { standardizeRecipeDetails } from "@/lib/openai/recipes";
import { normalizeRecipeResults } from "@/lib/recipes/search";
import type { NormalizedRecipe } from "@/lib/recipes/types";
import { spoonacularFetch } from "@/lib/spoonacular/fetch";

const API_KEY = process.env.SPOONACULAR_API_KEY;
const DETAIL_CACHE_VERSION = "v1";
const DETAIL_CACHE_TTL = 1000 * 60 * 60 * 6; // 6 hours

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    if (!API_KEY) {
      return NextResponse.json({ error: "Spoonacular API key missing" }, { status: 500 });
    }

    const { id } = await context.params;
    const recipeId = Number(id);
    if (!Number.isFinite(recipeId)) {
      return NextResponse.json({ error: "Invalid recipe id" }, { status: 400 });
    }

    const cacheKey = `recipe-detail:${DETAIL_CACHE_VERSION}:${recipeId}:${process.env.OPENAI_RECIPE_MODEL ?? "gpt-5.1"}`;
    const cached = getCacheValue<NormalizedRecipe>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const url = `https://api.spoonacular.com/recipes/${recipeId}/information?includeNutrition=true&apiKey=${API_KEY}`;
    const res = await spoonacularFetch(url);
    const raw = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: "Spoonacular error", detail: raw }, { status: res.status });
    }

    const { results } = normalizeRecipeResults("complexSearch", {
      results: [raw] as unknown[],
      totalResults: 1,
    });

    const normalizedRecipe = results[0] ?? null;
    if (!normalizedRecipe) {
      return NextResponse.json(null);
    }

    const standardized = await standardizeRecipeDetails({
      recipeId,
      normalized: normalizedRecipe,
      sourcePayload: raw,
    });

    const payload = {
      ...normalizedRecipe,
      standardized,
    };

    setCacheValue(cacheKey, payload, DETAIL_CACHE_TTL);

    return NextResponse.json(payload);
  } catch (err) {
    console.error("Recipe info error:", err);
    const detail = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "Server error", detail }, { status: 500 });
  }
}
