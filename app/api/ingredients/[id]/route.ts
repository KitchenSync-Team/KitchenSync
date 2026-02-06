import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  buildIngredientInfoUrl,
  normalizeCachedIngredientInfo,
  normalizeIngredientInfo,
  readIngredientInfoCache,
  writeIngredientInfoCache,
} from "@/lib/ingredients/details";
import { createClient } from "@/lib/supabase/server";
import { getSpoonacularClient } from "@/lib/spoonacular/client";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idParam } = await context.params;

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

    const id = Number(idParam);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "Invalid ingredient id" }, { status: 400 });
    }

    const { url, cacheKey, headers } = buildIngredientInfoUrl(id, client);

    const { data: cacheHit, error: cacheError } = await readIngredientInfoCache(cacheKey);
    if (cacheError) {
      console.error("Ingredient info cache read error:", cacheError);
    }
    if (cacheHit?.results && cacheHit.expires_at && new Date(cacheHit.expires_at) > new Date()) {
      const cached = normalizeCachedIngredientInfo(cacheHit.results, cacheKey);
      if (cached) {
        return NextResponse.json({ ...cached, cached: true });
      }
    }

    const apiRes = await fetch(url, { headers });
    const raw = await apiRes.json();
    if (!apiRes.ok) {
      return NextResponse.json({ error: "Spoonacular error", detail: raw }, { status: apiRes.status });
    }

    const normalized = normalizeIngredientInfo(raw, cacheKey);
    if (!normalized) {
      return NextResponse.json({ error: "Invalid ingredient payload" }, { status: 500 });
    }

    await writeIngredientInfoCache(cacheKey, normalized);

    return NextResponse.json({ ...normalized, cached: false });
  } catch (err) {
    console.error("Ingredient info error:", err);
    const detail = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "Server error", detail }, { status: 500 });
  }
}
