import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const API_KEY = process.env.SPOONACULAR_API_KEY!;
const BASE_URL = "https://api.spoonacular.com/recipes";

// Create a server-only Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // server only, safe
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, ingredients, query } = body;

    // --- Validation ---
    if (!type || !["ingredients", "keyword"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid search type." },
        { status: 400 }
      );
    }

    if (type === "ingredients" && (!ingredients || ingredients.length === 0)) {
      return NextResponse.json(
        { error: "Ingredients required." },
        { status: 400 }
      );
    }

    if (type === "keyword" && !query) {
      return NextResponse.json(
        { error: "Query required." },
        { status: 400 }
      );
    }

    // --- Cache Key ---
    const cacheKey =
      type === "ingredients"
        ? `ing:${ingredients.sort().join(",")}`
        : `kw:${query.toLowerCase().trim()}`;

    // --- Check Cache ---
    const { data: cacheHit, error: cacheError } = await supabase
      .from("recipe_cache")
      .select("results, expires_at")
      .eq("cache_key", cacheKey)
      .maybeSingle();

    if (cacheError) {
      console.error("Cache read error:", cacheError);
    }

    if (
      cacheHit &&
      cacheHit.expires_at &&
      new Date(cacheHit.expires_at) > new Date()
    ) {
      return NextResponse.json({
        results: cacheHit.results,
        cached: true,
      });
    }

    // --- Build API URL ---
    let url = "";
    if (type === "ingredients") {
      url =
        `${BASE_URL}/findByIngredients?ingredients=` +
        encodeURIComponent(ingredients.join(",")) +
        `&number=10&apiKey=${API_KEY}`;
    } else {
      url =
        `${BASE_URL}/complexSearch?query=` +
        encodeURIComponent(query) +
        `&number=10&apiKey=${API_KEY}`;
    }

    // --- Fetch from Spoonacular ---
    const apiRes = await fetch(url);
    const data = await apiRes.json();

    if (!apiRes.ok) {
      return NextResponse.json(
        { error: "Spoonacular error", detail: data },
        { status: apiRes.status }
      );
    }

    // --- Save to Cache (12h) ---
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();

    const { error: insertError } = await supabase
      .from("recipe_cache")
      .upsert({
        cache_key: cacheKey,
        results: data,
        expires_at: expiresAt,
      });

    if (insertError) {
      console.error("Cache insert error:", insertError);
    }

    return NextResponse.json({ results: data, cached: false });
  } catch (err: any) {
    console.error("Recipe Search Error:", err);
    return NextResponse.json(
      { error: "Server error", detail: err.message },
      { status: 500 }
    );
  }
}
