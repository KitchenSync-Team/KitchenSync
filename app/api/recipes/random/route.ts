import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { normalizeRecipeResults } from "@/lib/recipes/search";
import { spoonacularFetch } from "@/lib/spoonacular/fetch";
import { createClient } from "@/lib/supabase/server";

const API_KEY = process.env.SPOONACULAR_API_KEY;

export async function GET(req: NextRequest) {
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

    const urlParams = new URLSearchParams(req.nextUrl.searchParams);
    const number = Math.min(12, Math.max(1, Number(urlParams.get("number") ?? 6)));

    const includeParam = urlParams.get("include-tags") ?? urlParams.get("include") ?? "";
    const excludeParam = urlParams.get("exclude-tags") ?? urlParams.get("exclude") ?? "";
    const dietParam = urlParams.get("diet") ?? "";
    const intolerancesParam = urlParams.get("intolerances") ?? "";
    const cuisineParam = urlParams.get("cuisine") ?? "";
    const excludeCuisineParam = urlParams.get("excludeCuisine") ?? "";

    const includeTags = (includeParam || "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)
      .join(",");

    const excludeTags = (excludeParam || "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)
      .join(",");

    const useComplex =
      !!dietParam ||
      !!intolerancesParam ||
      !!cuisineParam ||
      !!excludeCuisineParam ||
      !!includeTags ||
      !!excludeTags;

    if (useComplex) {
      const params = new URLSearchParams();
      params.set("number", String(number));
      params.set("sort", "random");
      params.set("addRecipeInformation", "true");
      if (dietParam) params.set("diet", dietParam);
      if (intolerancesParam) params.set("intolerances", intolerancesParam);
      if (cuisineParam) params.set("cuisine", cuisineParam);
      if (excludeCuisineParam) params.set("excludeCuisine", excludeCuisineParam);
      if (includeTags) params.set("include-tags", includeTags);
      if (excludeTags) params.set("exclude-tags", excludeTags);

      const url = `https://api.spoonacular.com/recipes/complexSearch?${params.toString()}&apiKey=${API_KEY}`;
      const res = await spoonacularFetch(url);
      const raw = await res.json();

      if (!res.ok) {
        return NextResponse.json({ error: "Spoonacular error", detail: raw }, { status: res.status });
      }

      const { results, totalResults } = normalizeRecipeResults("complexSearch", raw);

      return NextResponse.json({
        results,
        totalResults,
        cached: false,
      });
    }

    const params = new URLSearchParams();
    params.set("number", String(number));

    const url = `https://api.spoonacular.com/recipes/random?${params.toString()}&apiKey=${API_KEY}`;

    const res = await spoonacularFetch(url);
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

    return NextResponse.json({
      results,
      totalResults: results.length,
      cached: false,
    });
  } catch (err) {
    console.error("Random recipes error:", err);
    const detail = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "Server error", detail }, { status: 500 });
  }
}
