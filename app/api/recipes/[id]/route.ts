import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { normalizeRecipeResults } from "@/lib/recipes/search";

const API_KEY = process.env.SPOONACULAR_API_KEY;

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

    const url = `https://api.spoonacular.com/recipes/${recipeId}/information?includeNutrition=true&apiKey=${API_KEY}`;
    const res = await fetch(url);
    const raw = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: "Spoonacular error", detail: raw }, { status: res.status });
    }

    const { results } = normalizeRecipeResults("complexSearch", {
      results: [raw] as unknown[],
      totalResults: 1,
    });

    return NextResponse.json(results[0] ?? null);
  } catch (err) {
    console.error("Recipe info error:", err);
    const detail = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "Server error", detail }, { status: 500 });
  }
}
