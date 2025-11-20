import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  buildGrocerySearch,
  normalizeCachedGroceries,
  normalizeGrocerySearch,
  readGroceryCache,
  writeGroceryCache,
} from "@/lib/groceries/search";
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

    const { url, cacheKey } = buildGrocerySearch({ query, apiKey: API_KEY, number });

    const { data: cacheHit, error: cacheError } = await readGroceryCache(cacheKey);
    if (cacheError) {
      console.error("Grocery cache read error:", cacheError);
    }
    if (cacheHit?.results && cacheHit.expires_at && new Date(cacheHit.expires_at) > new Date()) {
      const cachedPayload = normalizeCachedGroceries(cacheHit.results, cacheKey);
      return NextResponse.json(cachedPayload);
    }

    const apiRes = await fetch(url);
    const raw = await apiRes.json();
    if (!apiRes.ok) {
      return NextResponse.json({ error: "Spoonacular error", detail: raw }, { status: apiRes.status });
    }

    const normalized = normalizeGrocerySearch(raw, cacheKey);
    const payload = { ...normalized, cached: false };

    const { error: insertError } = await writeGroceryCache(cacheKey, payload);
    if (insertError) {
      console.error("Grocery cache insert error:", insertError);
    }

    return NextResponse.json(payload);
  } catch (err) {
    console.error("Grocery search error:", err);
    const detail = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "Server error", detail }, { status: 500 });
  }
}
