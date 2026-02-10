import type { StandardizedRecipeDetails } from "./standardized";

export type NormalizedIngredient = {
  id?: number;
  name: string;
  original: string;
};

export type RecipeIngredientMatch = {
  haveCount: number;
  missingCount: number;
  totalRequired: number;
  coverage: number;
  canMakeAll: boolean;
  have: NormalizedIngredient[];
  missing: NormalizedIngredient[];
};

export type NormalizedRecipe = {
  id: number;
  title: string;
  image: string | null;
  readyInMinutes?: number | null;
  aggregateLikes?: number | null;
  healthScore?: number | null;
  sourceUrl?: string | null;
  diets?: string[];
  instructions?: string | null;
  extendedIngredients?: NormalizedIngredient[];
  usedIngredientCount?: number;
  missedIngredientCount?: number;
  usedIngredients?: NormalizedIngredient[];
  missedIngredients?: NormalizedIngredient[];
  ingredientMatch?: RecipeIngredientMatch;
  standardized?: StandardizedRecipeDetails | null;
};

export type AppliedPreferences = {
  diet: string[];
  allergens: string[];
  includeCuisines: string[];
  excludeCuisines: string[];
  personalizationSkipped: boolean;
  usedPantryItems: string[];
};

export type RecipeSearchPayload = {
  query?: string;
  includeIngredients?: string[];
  maxReadyTime?: number;
  sort?: string;
  number?: number;
  usePantry?: boolean;
  ignorePreferences?: boolean;
  diet?: string[];
  allergens?: string[];
  cuisineLikes?: string[];
  cuisineDislikes?: string[];
  useCuisineLikes?: boolean;
  applyDiet?: boolean;
  applyAllergens?: boolean;
  applyCuisineDislikes?: boolean;
};

export type RecipeSearchResponse = {
  results: NormalizedRecipe[];
  totalResults: number;
  cached: boolean;
  appliedPreferences: AppliedPreferences;
  endpoint: "complexSearch" | "findByIngredients";
  cacheKey?: string;
};
