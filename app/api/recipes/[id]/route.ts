import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { buildFallbackStandardized, standardizeRecipeDetails } from "@/lib/openai/recipes";
import { normalizeRecipeResults } from "@/lib/recipes/search";
import { buildSpoonacularUrl, getSpoonacularClient } from "@/lib/spoonacular/client";
import { spoonacularFetch } from "@/lib/spoonacular/fetch";
import { createClient } from "@/lib/supabase/server";

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
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

    const { id } = await context.params;
    const recipeId = Number(id);
    if (!Number.isFinite(recipeId)) {
      return NextResponse.json({ error: "Invalid recipe id" }, { status: 400 });
    }

    const params = new URLSearchParams();
    params.set("includeNutrition", "true");
    const url = buildSpoonacularUrl(client, `/recipes/${recipeId}/information`, params);

    const res = await spoonacularFetch(url, { headers: client.headers });
    const raw = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: "Spoonacular error", detail: raw }, { status: res.status });
    }

    const { results } = normalizeRecipeResults("complexSearch", {
      results: [raw] as unknown[],
      totalResults: 1,
    });

    const recipe = results[0] ?? null;

    if (recipe) {
      try {
        const standardized = await standardizeRecipeDetails({
          recipeId,
          normalized: recipe,
          sourcePayload: raw,
        });
        if (standardized) {
          recipe.standardized = standardized;
        } else {
          const fallback = buildFallbackStandardized({
            recipeId,
            normalized: recipe,
            sourcePayload: raw,
          });
          if (fallback) {
            recipe.standardized = fallback;
          }
        }
      } catch (err) {
        console.error("Recipe standardization error:", err);
      }
    }

    return NextResponse.json(recipe);
  } catch (err) {
    console.error("Recipe info error:", err);
    const detail = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "Server error", detail }, { status: 500 });
  }
}
