import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { buildRecipeSearch, normalizeRecipeResults } from "@/lib/recipes/search";
import { attachIngredientMatch, sortRecipesByPantryMatch } from "@/lib/recipes/matching";
import type { NormalizedRecipe, RecipeSearchPayload, RecipeSearchResponse } from "@/lib/recipes/types";
import { isRecipeCacheFresh, readRecipeCache, writeRecipeCache } from "@/lib/cache/recipe-cache";
import { spoonacularFetch } from "@/lib/spoonacular/fetch";
import { createClient } from "@/lib/supabase/server";
import { buildSpoonacularUrl, getSpoonacularClient } from "@/lib/spoonacular/client";

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

    let { endpoint, url, cacheKey, applied, headers, pantryItems } = searchConfig;
    const hasKeywordQuery = typeof payload.query === "string" && payload.query.trim().length > 0;
    const hasExplicitIngredientConstraints = (payload.includeIngredients?.length ?? 0) > 0;
    const shouldTryIngredientFallback = hasKeywordQuery && hasExplicitIngredientConstraints;
    const shouldTryKeywordFallback = hasKeywordQuery;

    const { data: cacheHit, error: cacheError } = await readRecipeCache(cacheKey);

    if (cacheError) {
      console.error("Cache read error:", cacheError);
    }

    const cacheFresh = Boolean(cacheHit && cacheHit.results && isRecipeCacheFresh(cacheHit.expires_at));
    const cacheHasZeroResults =
      cacheFresh &&
      Array.isArray((cacheHit?.results as Partial<RecipeSearchResponse> | undefined)?.results) &&
      (((cacheHit?.results as Partial<RecipeSearchResponse>).results?.length ?? 0) === 0);
    const allowCacheRead = !hasKeywordQuery;

    if (allowCacheRead && cacheFresh && !(shouldTryKeywordFallback && cacheHasZeroResults)) {
      const cachedPayload = normalizeCachedPayload(cacheHit?.results, applied, endpoint, cacheKey);
      const matched = attachIngredientMatch(cachedPayload.results, pantryItems);
      const ranked = hasKeywordQuery
        ? sortKeywordResultsByPreferences(matched, applied)
        : sortRecipesByPantryMatch(matched);
      return NextResponse.json({
        ...cachedPayload,
        results: ranked,
        cached: true,
      });
    }

    const apiRes = await spoonacularFetch(url, { headers });
    const rawData = await apiRes.json();

    if (!apiRes.ok) {
      return NextResponse.json(
        { error: "Spoonacular error", detail: rawData },
        { status: apiRes.status },
      );
    }

    let normalized = normalizeRecipeResults(endpoint, rawData);
    if (shouldTryIngredientFallback && normalized.results.length === 0) {
      try {
        const fallbackConfig = await buildRecipeSearch({
          payload: {
            query: payload.query,
            includeIngredients: [],
            maxReadyTime: payload.maxReadyTime,
            sort: payload.sort,
            number: payload.number,
            usePantry: false,
            ignorePreferences: payload.ignorePreferences,
            diet: payload.diet,
            allergens: payload.allergens,
            cuisineLikes: payload.cuisineLikes,
            cuisineDislikes: payload.cuisineDislikes,
          },
          userId: user.id,
          client,
        });

        endpoint = fallbackConfig.endpoint;
        url = fallbackConfig.url;
        cacheKey = fallbackConfig.cacheKey;
        applied = fallbackConfig.applied;
        headers = fallbackConfig.headers;
        pantryItems = fallbackConfig.pantryItems;

        const fallbackRes = await spoonacularFetch(url, { headers });
        const fallbackRaw = await fallbackRes.json();
        if (fallbackRes.ok) {
          normalized = normalizeRecipeResults(endpoint, fallbackRaw);
        }
      } catch (fallbackErr) {
        console.error("Recipe search fallback error:", fallbackErr);
      }
    }

    if (shouldTryKeywordFallback && normalized.results.length === 0) {
      try {
        const queryOnlyConfig = await buildRecipeSearch({
          payload: {
            query: payload.query,
            includeIngredients: [],
            maxReadyTime: payload.maxReadyTime,
            sort: payload.sort,
            number: payload.number,
            usePantry: false,
            ignorePreferences: true,
            diet: [],
            allergens: [],
            cuisineLikes: [],
            cuisineDislikes: [],
            useCuisineLikes: false,
            applyDiet: false,
            applyAllergens: false,
            applyCuisineDislikes: false,
          },
          userId: user.id,
          client,
        });

        endpoint = queryOnlyConfig.endpoint;
        url = queryOnlyConfig.url;
        cacheKey = queryOnlyConfig.cacheKey;
        applied = queryOnlyConfig.applied;
        headers = queryOnlyConfig.headers;
        pantryItems = queryOnlyConfig.pantryItems;

        const queryOnlyRes = await spoonacularFetch(url, { headers });
        const queryOnlyRaw = await queryOnlyRes.json();
        if (queryOnlyRes.ok) {
          normalized = normalizeRecipeResults(endpoint, queryOnlyRaw);
        }
      } catch (fallbackErr) {
        console.error("Recipe search query-only fallback error:", fallbackErr);
      }
    }

    if (shouldTryKeywordFallback && normalized.results.length === 0) {
      try {
        const minimalParams = new URLSearchParams();
        minimalParams.set("query", payload.query?.trim() ?? "");
        minimalParams.set("number", String(Math.min(24, Math.max(1, payload.number ?? 12))));
        const minimalUrl = buildSpoonacularUrl(client, "/recipes/complexSearch", minimalParams);
        const minimalRes = await spoonacularFetch(minimalUrl, { headers: client.headers });
        const minimalRaw = await minimalRes.json();
        if (minimalRes.ok) {
          normalized = normalizeRecipeResults("complexSearch", minimalRaw);
          endpoint = "complexSearch";
          cacheKey = `recipes:minimal:${encodeURIComponent(payload.query?.trim() ?? "")}`;
          applied = {
            diet: [],
            allergens: [],
            includeCuisines: [],
            excludeCuisines: [],
            personalizationSkipped: true,
            usedPantryItems: [],
          };
        }
      } catch (fallbackErr) {
        console.error("Recipe search minimal fallback error:", fallbackErr);
      }
    }

    const responseBody: RecipeSearchResponse = {
      results: normalized.results,
      totalResults: normalized.totalResults,
      cached: false,
      appliedPreferences: applied,
      endpoint,
      cacheKey,
    };

    const { error: insertError } = await writeRecipeCache(cacheKey, responseBody);

    if (insertError) {
      console.error("Cache insert error:", insertError);
    }

    const matched = attachIngredientMatch(responseBody.results, pantryItems);
    const ranked = hasKeywordQuery
      ? sortKeywordResultsByPreferences(matched, applied)
      : sortRecipesByPantryMatch(matched);
    return NextResponse.json({
      ...responseBody,
      results: ranked,
    });
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

function sortKeywordResultsByPreferences(
  recipes: NormalizedRecipe[],
  applied: RecipeSearchResponse["appliedPreferences"],
): NormalizedRecipe[] {
  const dietTargets = normalizeTokens(applied.diet);
  const allergenTargets = normalizeTokens(applied.allergens);
  const includeCuisineTargets = normalizeTokens(applied.includeCuisines);
  const excludeCuisineTargets = normalizeTokens(applied.excludeCuisines);

  return [...recipes].sort((a, b) => {
    const aScore = keywordPreferenceScore(
      a,
      dietTargets,
      allergenTargets,
      includeCuisineTargets,
      excludeCuisineTargets,
    );
    const bScore = keywordPreferenceScore(
      b,
      dietTargets,
      allergenTargets,
      includeCuisineTargets,
      excludeCuisineTargets,
    );
    if (aScore !== bScore) return bScore - aScore;
    const aLikes = typeof a.aggregateLikes === "number" ? a.aggregateLikes : 0;
    const bLikes = typeof b.aggregateLikes === "number" ? b.aggregateLikes : 0;
    return bLikes - aLikes;
  });
}

function keywordPreferenceScore(
  recipe: NormalizedRecipe,
  dietTargets: Set<string>,
  allergenTargets: Set<string>,
  includeCuisineTargets: Set<string>,
  excludeCuisineTargets: Set<string>,
): number {
  let score = 0;
  const recipeDiets = normalizeTokens(recipe.diets ?? []);
  const recipeTitle = normalizeToken(recipe.title);

  for (const diet of dietTargets) {
    if (recipeDiets.has(diet)) score += 8;
  }

  for (const allergen of allergenTargets) {
    const mapped = allergenToDietTag(allergen);
    if (mapped && recipeDiets.has(mapped)) score += 10;
  }

  for (const cuisine of includeCuisineTargets) {
    if (recipeTitle.includes(cuisine)) score += 2;
  }
  for (const cuisine of excludeCuisineTargets) {
    if (recipeTitle.includes(cuisine)) score -= 6;
  }

  const pantryCoverage = recipe.ingredientMatch?.coverage ?? 0;
  score += pantryCoverage * 4;
  return score;
}

function allergenToDietTag(value: string): string | null {
  if (value === "wheat" || value === "gluten") return "gluten free";
  if (value === "dairy") return "dairy free";
  if (value === "egg" || value === "eggs") return "egg free";
  if (value === "soy") return "soy free";
  if (value === "shellfish") return "shellfish free";
  if (value === "fish") return "fish free";
  if (value === "peanut" || value === "peanuts") return "peanut free";
  if (value === "tree nut" || value === "tree nuts" || value === "nut" || value === "nuts") {
    return "tree nut free";
  }
  return null;
}

function normalizeTokens(values: string[]): Set<string> {
  const bucket = new Set<string>();
  for (const value of values) {
    const normalized = normalizeToken(value);
    if (normalized) bucket.add(normalized);
  }
  return bucket;
}

function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}
