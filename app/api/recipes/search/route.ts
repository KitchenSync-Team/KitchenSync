import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { buildRecipeSearch, normalizeRecipeResults } from "@/lib/recipes/search";
import type { RecipeSearchPayload, RecipeSearchResponse } from "@/lib/recipes/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createClient } from "@/lib/supabase/server";
import { getSpoonacularClient } from "@/lib/spoonacular/client";

export async function POST(req: NextRequest) {
  try {
    let client;
    try {
      client = getSpoonacularClient();
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Spoonacular API key missing";
      return NextResponse.json(
        { error: "Spoonacular API key is not configured on the server.", detail },
        { status: 500 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawBody = (await req.json()) as Record<string, unknown>;
    const payload: Partial<RecipeSearchPayload> = {
      query: typeof rawBody.query === "string" ? rawBody.query : undefined,
      includeIngredients: toStringArray(rawBody.includeIngredients),
      maxReadyTime: typeof rawBody.maxReadyTime === "number" ? rawBody.maxReadyTime : undefined,
      sort: typeof rawBody.sort === "string" ? rawBody.sort : undefined,
      number: typeof rawBody.number === "number" ? rawBody.number : undefined,
      usePantry: rawBody.usePantry !== false,
      ignorePreferences: rawBody.ignorePreferences === true,
      diet: toStringArray(rawBody.diet),
      allergens: toStringArray(rawBody.allergens),
      cuisineLikes: toStringArray(rawBody.cuisineLikes),
      cuisineDislikes: toStringArray(rawBody.cuisineDislikes),
      useCuisineLikes: rawBody.useCuisineLikes === true,
      applyDiet: rawBody.applyDiet !== false,
      applyAllergens: rawBody.applyAllergens !== false,
      applyCuisineDislikes: rawBody.applyCuisineDislikes !== false,
    };

    let searchConfig;
    try {
      searchConfig = await buildRecipeSearch({
        payload: {
          query: payload.query,
          includeIngredients: dedupeList(payload.includeIngredients ?? []),
          maxReadyTime: payload.maxReadyTime,
          sort: payload.sort,
          number: payload.number,
          usePantry: payload.usePantry,
          ignorePreferences: payload.ignorePreferences,
          diet: payload.diet,
          allergens: payload.allergens,
          cuisineLikes: payload.cuisineLikes,
          cuisineDislikes: payload.cuisineDislikes,
        },
        userId: user.id,
        client,
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Invalid recipe search payload";
      return NextResponse.json({ error: detail }, { status: 400 });
    }

    const { endpoint, url, cacheKey, applied, headers } = searchConfig;

    const admin = createServiceRoleClient();

    const { data: cacheHit, error: cacheError } = await admin
      .from("recipe_cache")
      .select("results, expires_at")
      .eq("cache_key", cacheKey)
      .maybeSingle();

    if (cacheError) {
      console.error("Cache read error:", cacheError);
    }

    const now = new Date();
    if (
      cacheHit &&
      cacheHit.expires_at &&
      new Date(cacheHit.expires_at) > now &&
      cacheHit.results
    ) {
      const cachedPayload = normalizeCachedPayload(cacheHit.results, applied, endpoint, cacheKey);
      return NextResponse.json({ ...cachedPayload, cached: true });
    }

    const apiRes = await fetch(url, { headers });
    const rawData = await apiRes.json();

    if (!apiRes.ok) {
      return NextResponse.json(
        { error: "Spoonacular error", detail: rawData },
        { status: apiRes.status },
      );
    }

    const normalized = normalizeRecipeResults(endpoint, rawData);

    const responseBody: RecipeSearchResponse = {
      results: normalized.results,
      totalResults: normalized.totalResults,
      cached: false,
      appliedPreferences: applied,
      endpoint,
      cacheKey,
    };

    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();

    const { error: insertError } = await admin
      .from("recipe_cache")
      .upsert({
        cache_key: cacheKey,
        results: responseBody,
        expires_at: expiresAt,
      });

    if (insertError) {
      console.error("Cache insert error:", insertError);
    }

    return NextResponse.json(responseBody);
  } catch (err: unknown) {
    console.error("Recipe Search Error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "Server error", detail: message }, { status: 500 });
  }
}

function normalizeCachedPayload(
  cached: unknown,
  applied: RecipeSearchResponse["appliedPreferences"],
  endpoint: RecipeSearchResponse["endpoint"],
  cacheKey: string,
): RecipeSearchResponse {
  const fallback: RecipeSearchResponse = {
    results: [],
    totalResults: 0,
    cached: true,
    appliedPreferences: applied,
    endpoint,
    cacheKey,
  };

  if (!cached || typeof cached !== "object") {
    return fallback;
  }

  const maybePayload = cached as Partial<RecipeSearchResponse>;
  return {
    results: Array.isArray(maybePayload.results) ? maybePayload.results : [],
    totalResults:
      typeof maybePayload.totalResults === "number" ? maybePayload.totalResults : fallback.totalResults,
    cached: true,
    appliedPreferences: applied ?? maybePayload.appliedPreferences ?? fallback.appliedPreferences,
    endpoint: maybePayload.endpoint ?? endpoint,
    cacheKey: maybePayload.cacheKey ?? cacheKey,
  };
}

function dedupeList(values: unknown[]): string[] {
  const bucket = new Set<string>();
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    bucket.add(trimmed);
  }
  return Array.from(bucket);
}

function toStringArray(value: unknown): string[] | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) {
    return value
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    return trimmed.split(",").map((part) => part.trim()).filter(Boolean);
  }
  return undefined;
}
