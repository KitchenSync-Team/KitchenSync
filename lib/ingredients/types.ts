export type IngredientSearchResult = {
  id: number;
  name: string;
  image: string | null;
  aisle?: string | null;
};

export type IngredientSearchResponse = {
  results: IngredientSearchResult[];
  totalResults: number;
  cached: boolean;
  appliedIntolerances: string[];
  cacheKey?: string;
};

export type AddIngredientPayload = {
  name: string;
  brand?: string;
  category?: string;
  quantity?: number;
  unitId?: string | null;
  locationId?: string | null;
  expiresAt?: string | null;
  notes?: string;
  spoonacularId?: number;
  imageUrl?: string;
  aisle?: string;
  possibleUnits?: string[];
  badges?: Record<string, unknown>;
  raw?: Record<string, unknown>;
};
