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
import { dietFilterToSearchHint, normalizeDietFilterKeys } from "@/lib/ingredients/badges";
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
    const offset = typeof body.offset === "number" ? body.offset : undefined;

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const userContext = await loadUserRecipeContext(user.id);
    const intolerances = Array.isArray(body.intolerances)
      ? body.intolerances.filter((value): value is string => typeof value === "string")
      : userContext.allergens;
    const dietFilters = Array.isArray(body.dietFilters)
      ? normalizeDietFilterKeys(body.dietFilters.filter((value): value is string => typeof value === "string"))
      : normalizeDietFilterKeys(userContext.dietaryPreferences);
    const strictDiet = body.strictDiet !== false;

    const { url, cacheKey, headers } = await searchIngredients({
      query,
      client,
      limit: number,
      offset,
      intolerances,
      dietFilters,
      strictDiet,
    });

    const { data: cacheHit, error: cacheError } = await readIngredientCache(cacheKey);

    if (cacheError) {
      console.error("Ingredient cache read error", cacheError);
    }

    const cacheFresh = Boolean(cacheHit?.results && isRecipeCacheFresh(cacheHit.expires_at));
    const cacheRows = Array.isArray((cacheHit?.results as Partial<IngredientSearchResponse> | undefined)?.results)
      ? ((cacheHit?.results as Partial<IngredientSearchResponse>).results ?? [])
      : [];
    const cacheHasZeroResults = cacheRows.length === 0;
    const shouldBypassZeroCache = dietFilters.length > 0 && cacheHasZeroResults;

    if (cacheFresh && cacheHit?.results && !shouldBypassZeroCache) {
      const cachedPayload = normalizeCachedIngredients(
        cacheHit.results,
        intolerances,
        dietFilters,
        strictDiet,
        cacheKey,
      );
      return NextResponse.json(cachedPayload);
    }

    const apiRes = await spoonacularFetch(url, { headers });
    const raw = await apiRes.json();

    if (!apiRes.ok) {
      return NextResponse.json({ error: "Spoonacular error", detail: raw }, { status: apiRes.status });
    }

    let normalized = normalizeIngredientSearch(raw, intolerances, dietFilters, strictDiet, cacheKey);

    const hinted = dietFilterToSearchHint(dietFilters[0] ?? "");
    const normalizedQuery = query.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
    const normalizedHint = hinted.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
    const shouldRunBoostedSearch =
      dietFilters.length > 0 && Boolean(normalizedHint) && offset === 0 && !normalizedQuery.includes(normalizedHint);

    if (shouldRunBoostedSearch) {
      const boostedQuery = `${hinted} ${query}`.trim();
      const boostedSearch = await searchIngredients({
        query: boostedQuery,
        client,
        limit: number,
        offset: 0,
        intolerances,
        dietFilters,
        strictDiet,
      });
      const boostedRes = await spoonacularFetch(boostedSearch.url, { headers: boostedSearch.headers });
      const boostedRaw = await boostedRes.json();
      if (boostedRes.ok) {
        const boostedNormalized = normalizeIngredientSearch(
          boostedRaw,
          intolerances,
          dietFilters,
          strictDiet,
          boostedSearch.cacheKey,
        );
        const limit = typeof number === "number" && Number.isFinite(number) ? Math.max(1, Math.min(25, number)) : 12;
        const merged = dedupeById([...boostedNormalized.results, ...normalized.results]).slice(0, limit);
        normalized = {
          ...normalized,
          results: merged,
          totalResults: merged.length,
        };
      }
    }

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

function dedupeById<T extends { id: number }>(rows: T[]): T[] {
  const seen = new Set<number>();
  const out: T[] = [];
  for (const row of rows) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
  }
  return out;
}
