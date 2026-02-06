import crypto from "node:crypto";

import { buildSpoonacularUrl, type SpoonacularClient } from "@/lib/spoonacular/client";
import { readRecipeCache, writeRecipeCache } from "@/lib/cache/recipe-cache";

type SpoonacularIngredientInfo = {
  id?: number;
  name?: string;
  possibleUnits?: string[];
  aisle?: string;
  image?: string;
  nutrition?: unknown;
};

export type IngredientInfo = {
  id: number;
  name: string;
  aisle: string | null;
  image: string | null;
  possibleUnits: string[];
  nutrition?: unknown;
  cacheKey?: string;
};

export function buildIngredientInfoUrl(id: number, client: SpoonacularClient) {
  const params = new URLSearchParams();
  params.set("amount", "1");
  const url = buildSpoonacularUrl(client, `/food/ingredients/${id}/information`, params);
  const cacheKey = `ingredient-info:${hashKey(String(id))}`;
  return { url, cacheKey, headers: client.headers };
}

export function normalizeIngredientInfo(data: unknown, cacheKey?: string): IngredientInfo | null {
  const payload = (data ?? {}) as SpoonacularIngredientInfo;
  if (typeof payload.id !== "number" || !payload.name) return null;
  return {
    id: payload.id,
    name: payload.name,
    aisle: typeof payload.aisle === "string" ? payload.aisle : null,
    image: normalizeImage(payload.image),
    possibleUnits: Array.isArray(payload.possibleUnits)
      ? payload.possibleUnits
          .map((unit) => unit.trim())
          .filter((unit) => unit.length > 0)
      : [],
    nutrition: payload.nutrition ?? undefined,
    cacheKey,
  };
}

export async function readIngredientInfoCache(cacheKey: string) {
  return readRecipeCache(cacheKey);
}

export function normalizeCachedIngredientInfo(
  cached: unknown,
  cacheKey: string,
): IngredientInfo | null {
  if (!cached || typeof cached !== "object") return null;
  const payload = cached as Partial<IngredientInfo>;
  if (typeof payload.id !== "number" || !payload.name) return null;
  return {
    id: payload.id,
    name: payload.name,
    aisle: payload.aisle ?? null,
    image: payload.image ?? null,
    possibleUnits: Array.isArray(payload.possibleUnits) ? payload.possibleUnits : [],
    nutrition: payload.nutrition ?? undefined,
    cacheKey: payload.cacheKey ?? cacheKey,
  };
}

export async function writeIngredientInfoCache(cacheKey: string, payload: IngredientInfo) {
  return writeRecipeCache(cacheKey, payload);
}

function normalizeImage(image: unknown): string | null {
  if (typeof image !== "string" || image.length === 0) return null;
  if (image.startsWith("http")) return image;
  return `https://img.spoonacular.com/ingredients_250x250/${image}`;
}

function hashKey(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
