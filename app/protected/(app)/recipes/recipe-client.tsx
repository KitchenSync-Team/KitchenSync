"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, ExternalLink, Loader2, Search, Sparkles, Timer, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { InventoryIngredientCard } from "@/components/inventory/inventory-ingredient-card";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { RecipeTagReferenceBadge } from "@/components/recipes/recipe-tag-reference-badge";
import { RecipeCardSkeleton } from "@/components/recipes/recipe-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { formatInventoryItemName } from "@/lib/formatting/inventory";
import { getGlutenSafetyWarning } from "@/lib/recipes/gluten-safety";
import type { AppliedPreferences, NormalizedRecipe, RecipeSearchResponse } from "@/lib/recipes/types";
import {
  ALLERGEN_OPTIONS,
  CUISINE_PREFERENCE_OPTIONS,
  DIETARY_OPTIONS,
} from "@/app/protected/onboarding/constants";
import { cn } from "@/lib/supabase/utils";

type PreferencesSnapshot = {
  dietaryPreferences: string[];
  allergens: string[];
  cuisineLikes: string[];
  cuisineDislikes: string[];
  personalizationOptIn: boolean;
};

type SearchMeta = {
  totalResults: number;
  cached: boolean;
  appliedPreferences: AppliedPreferences;
};

type PantryPickerItem = {
  id: string;
  name: string;
  spoonacularIngredientId: number | null;
  quantity: number;
  unit: string | null;
  expiresAt: string | null;
  aisle: string | null;
  imageUrl: string | null;
  locationId: string;
  locationName: string;
};

type PantryPickerLocation = {
  id: string;
  name: string;
  items: PantryPickerItem[];
};

export function RecipeClient({ preferences }: { preferences: PreferencesSnapshot }) {
  const [query, setQuery] = useState("");
  const [pantryDialogOpen, setPantryDialogOpen] = useState(false);
  const [pantryLocations, setPantryLocations] = useState<PantryPickerLocation[]>([]);
  const [pantryLoading, setPantryLoading] = useState(false);
  const [pantryError, setPantryError] = useState<string | null>(null);
  const [pantryFilter, setPantryFilter] = useState("");
  const [selectedPantryItemIds, setSelectedPantryItemIds] = useState<string[]>([]);
  const [ignorePreferences, setIgnorePreferences] = useState(false);
  const [maxReadyTime, setMaxReadyTime] = useState<string>("");
  const [sort, setSort] = useState<string>("max-used-ingredients");
  const [results, setResults] = useState<NormalizedRecipe[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [meta, setMeta] = useState<SearchMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRecipe, setDetailRecipe] = useState<NormalizedRecipe | null>(null);
  const [detailInfo, setDetailInfo] = useState<NormalizedRecipe | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [hungryLoading, setHungryLoading] = useState(false);
  const detailCacheRef = useRef<Map<number, NormalizedRecipe>>(new Map());
  const inflightDetailsRef = useRef<Map<number, Promise<NormalizedRecipe>>>(new Map());
  const prefetchAbortRef = useRef<{ generation: number }>({ generation: 0 });
  const detailStandardized = detailInfo?.standardized ?? null;
  const standardizedIngredients =
    detailStandardized && detailStandardized.ingredients?.length
      ? detailStandardized.ingredients
      : null;
  const standardizedSteps =
    detailStandardized && detailStandardized.steps?.length ? detailStandardized.steps : null;
  const fallbackInstructions =
    !standardizedSteps && detailInfo?.instructions ? formatInstructions(detailInfo.instructions) : [];
  const nutritionSnapshot = detailStandardized?.nutrition ?? null;
  const showNutrition = Boolean(nutritionSnapshot && hasNutritionData(nutritionSnapshot));
  const dietBadges = Array.from(
    new Set([...(detailStandardized?.metadata?.diets ?? []), ...(detailInfo?.diets ?? [])]),
  ).filter((value) => value.trim().length > 0);
  const glutenSafetyWarning = getGlutenSafetyWarning({
    diets: dietBadges,
    extendedIngredients: detailInfo?.extendedIngredients,
  });
  const allergenBadges = (detailStandardized?.metadata?.tags ?? []).filter((tag) =>
    /free|gluten|dairy|nut|soy|egg|shellfish|allergen/i.test(tag),
  );
  const totalMinutes = detailStandardized?.metadata?.totalMinutes ?? detailInfo?.readyInMinutes ?? null;
  const prepMinutes = detailStandardized?.metadata?.prepMinutes ?? null;
  const cookMinutes = detailStandardized?.metadata?.cookMinutes ?? null;
  const servings = detailStandardized?.metadata?.servings ?? null;

  const [selectedDiets, setSelectedDiets] = useState(preferences.dietaryPreferences ?? []);
  const [selectedAllergens, setSelectedAllergens] = useState(preferences.allergens ?? []);
  const [selectedLikes, setSelectedLikes] = useState(preferences.cuisineLikes ?? []);
  const [selectedDislikes, setSelectedDislikes] = useState(preferences.cuisineDislikes ?? []);

  const parsedMaxReadyTime = useMemo(() => {
    const parsed = Number(maxReadyTime);
    return Number.isFinite(parsed) ? parsed : undefined;
  }, [maxReadyTime]);

  const dietOptions = useMemo(
    () => DIETARY_OPTIONS.map((option) => option.value),
    [],
  );
  const dietLabels = useMemo(
    () => Object.fromEntries(DIETARY_OPTIONS.map((option) => [option.value, option.label])),
    [],
  );
  const allergenOptions = useMemo(() => ALLERGEN_OPTIONS.map((option) => option.value), []);
  const allergenLabels = useMemo(
    () => Object.fromEntries(ALLERGEN_OPTIONS.map((option) => [option.value, option.label])),
    [],
  );
  const cuisineOptions = useMemo(
    () => CUISINE_PREFERENCE_OPTIONS.map((option) => option.value),
    [],
  );
  const cuisineLabels = useMemo(
    () => Object.fromEntries(CUISINE_PREFERENCE_OPTIONS.map((option) => [option.value, option.label])),
    [],
  );
  const pantryItemIndex = useMemo(() => {
    const index = new Map<string, PantryPickerItem>();
    for (const location of pantryLocations) {
      for (const item of location.items) {
        index.set(item.id, item);
      }
    }
    return index;
  }, [pantryLocations]);
  const selectedPantryItems = useMemo(
    () =>
      selectedPantryItemIds
        .map((id) => pantryItemIndex.get(id))
        .filter((item): item is PantryPickerItem => Boolean(item)),
    [pantryItemIndex, selectedPantryItemIds],
  );
  const filteredPantryLocations = useMemo(() => {
    const needle = pantryFilter.trim().toLowerCase();
    if (!needle) return pantryLocations;
    return pantryLocations
      .map((location) => ({
        ...location,
        items: location.items.filter((item) => {
          const blob = `${item.name} ${item.aisle ?? ""} ${location.name}`.toLowerCase();
          return blob.includes(needle);
        }),
      }))
      .filter((location) => location.items.length > 0);
  }, [pantryFilter, pantryLocations]);
  const trimmedQuery = query.trim();

  const toggleDiet = (value: string) => {
    setSelectedDiets((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  };

  const toggleAllergen = (value: string) => {
    setSelectedAllergens((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  };

  const toggleLike = (value: string) => {
    setSelectedLikes((current) => {
      const next = new Set(current);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      setSelectedDislikes((dislikes) => dislikes.filter((item) => item !== value));
      return Array.from(next);
    });
  };

  const toggleDislike = (value: string) => {
    setSelectedDislikes((current) => {
      const next = new Set(current);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      setSelectedLikes((likes) => likes.filter((item) => item !== value));
      return Array.from(next);
    });
  };

  const clearAllFilters = () => {
    setSelectedDiets([]);
    setSelectedAllergens([]);
    setSelectedLikes([]);
    setSelectedDislikes([]);
    setMaxReadyTime("");
    setSort("max-used-ingredients");
    setIgnorePreferences(false);
    setSelectedPantryItemIds([]);
    setHasSearched(false);
  };

  const resetFiltersToProfile = () => {
    setSelectedDiets(preferences.dietaryPreferences ?? []);
    setSelectedAllergens(preferences.allergens ?? []);
    setSelectedLikes(preferences.cuisineLikes ?? []);
    setSelectedDislikes(preferences.cuisineDislikes ?? []);
  };

  const loadPantryInventory = useCallback(async () => {
    if (pantryLoading) return;
    setPantryLoading(true);
    setPantryError(null);
    try {
      const res = await fetch("/api/recipes/pantry");
      const data = (await res.json()) as {
        locations?: {
          id: string;
          name: string;
          items: Omit<PantryPickerItem, "locationId" | "locationName">[];
        }[];
        error?: string;
        detail?: string;
      };
      if (!res.ok) {
        const message =
          typeof data.error === "string"
            ? data.error
            : typeof data.detail === "string"
              ? data.detail
              : "Unable to load kitchen inventory.";
        setPantryError(message);
        return;
      }
      const locations = Array.isArray(data.locations)
        ? data.locations.map((location) => ({
          id: location.id,
          name: location.name,
          items: (location.items ?? []).map((item) => ({
            ...item,
            id: `${location.id}:${item.id}`,
            locationId: location.id,
            locationName: location.name,
          })),
        }))
        : [];
      setPantryLocations(locations);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load kitchen inventory.";
      setPantryError(message);
    } finally {
      setPantryLoading(false);
    }
  }, [pantryLoading]);

  useEffect(() => {
    if (!pantryDialogOpen) return;
    if (pantryLocations.length > 0) return;
    void loadPantryInventory();
  }, [loadPantryInventory, pantryDialogOpen, pantryLocations.length]);

  const togglePantryItem = useCallback((id: string) => {
    setSelectedPantryItemIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }, []);

  const fetchRecipeDetails = useCallback(
    async (recipe: NormalizedRecipe): Promise<NormalizedRecipe> => {
      const cached = detailCacheRef.current.get(recipe.id);
      if (cached) return cached;

      const inflight = inflightDetailsRef.current.get(recipe.id);
      if (inflight) return inflight;

      const request = (async () => {
        try {
          const res = await fetch(`/api/recipes/${recipe.id}`);
          const data = await res.json();
          if (res.ok && data) {
            const merged: NormalizedRecipe = { ...recipe, ...(data as NormalizedRecipe) };
            detailCacheRef.current.set(recipe.id, merged);
            return merged;
          }
        } catch {
          // ignore detail fetch errors; we still show basic info
        }
        return recipe;
      })();

      inflightDetailsRef.current.set(recipe.id, request);
      try {
        return await request;
      } finally {
        inflightDetailsRef.current.delete(recipe.id);
      }
    },
    [],
  );

  useEffect(() => {
    if (!detailRecipe) {
      setDetailInfo(null);
      setDetailLoading(false);
      return;
    }

    const cached = detailCacheRef.current.get(detailRecipe.id);
    if (cached) {
      setDetailInfo(cached);
      setDetailLoading(false);
      return;
    }

    setDetailLoading(true);
    setDetailInfo(detailRecipe);

    let cancelled = false;
    void fetchRecipeDetails(detailRecipe)
      .then((merged) => {
        if (!cancelled) {
          setDetailInfo(merged);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setDetailLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [detailRecipe, fetchRecipeDetails]);

  const prefetchRecipeDetails = useCallback(
    (recipe: NormalizedRecipe) => {
      if (detailCacheRef.current.has(recipe.id)) return;
      void fetchRecipeDetails(recipe);
    },
    [fetchRecipeDetails],
  );

  const prefetchBatchDetails = useCallback(
    (recipes: NormalizedRecipe[], generation: number) => {
      const runSequential = async (index: number) => {
        if (prefetchAbortRef.current.generation !== generation) return;
        if (index >= recipes.length) return;
        const recipe = recipes[index];
        if (!detailCacheRef.current.has(recipe.id)) {
          await fetchRecipeDetails(recipe);
        }
        setTimeout(() => runSequential(index + 1), 200);
      };
      void runSequential(0);
    },
    [fetchRecipeDetails],
  );

  async function runSearch() {
    setLoading(true);
    setError(null);
    setHasSearched(true);
    prefetchAbortRef.current.generation += 1;

    const queryValue = trimmedQuery;
    const includeIngredients = Array.from(
      new Set(
        selectedPantryItems
          .map((item) => item.name.trim())
          .filter(Boolean),
      ),
    );

    if (!queryValue && includeIngredients.length === 0) {
      setError("Add a keyword or select ingredients to search.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/recipes/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: queryValue || undefined,
          includeIngredients,
          maxReadyTime: parsedMaxReadyTime,
          sort,
          usePantry: true,
          debug: true,
          ignorePreferences,
          diet: selectedDiets,
          allergens: selectedAllergens,
          cuisineLikes: selectedLikes,
          cuisineDislikes: selectedDislikes,
          useCuisineLikes: selectedLikes.length > 0,
          applyDiet: selectedDiets.length > 0,
          applyAllergens: selectedAllergens.length > 0,
          applyCuisineDislikes: selectedDislikes.length > 0,
        }),
      });

      const data = (await res.json()) as Partial<RecipeSearchResponse> & Record<string, unknown>;
      if (!res.ok) {
        const message =
          typeof data?.error === "string"
            ? data.error
            : typeof data?.detail === "string"
              ? data.detail
              : "Recipe search failed";
        setError(message);
        return;
      }

      const nextResults = Array.isArray(data.results) ? data.results : [];

      if (nextResults.length === 0) {
        const debug = data && typeof data === "object" && "debug" in data
          ? (data.debug as { final?: { params?: Record<string, string> } } | undefined)
          : undefined;
        const message = buildNoResultsMessage({
          query: queryValue,
          includeIngredients,
          selectedDiets,
          selectedAllergens,
          selectedLikes,
          selectedDislikes,
          debugParams: debug?.final?.params ?? {},
        });
        setError(message);
      }

      setResults(nextResults);
      if (nextResults.length > 0) {
        const nextGeneration = prefetchAbortRef.current.generation;
        prefetchBatchDetails(
          nextResults.slice(0, 12).map((recipe: NormalizedRecipe) => ({ ...recipe })),
          nextGeneration,
        );
      }
      setMeta({
        totalResults:
          nextResults.length > 0
            ? nextResults.length
            : (typeof data.totalResults === "number" ? data.totalResults : 0),
        cached: data.cached === true,
        appliedPreferences: {
          diet: selectedDiets,
          allergens: selectedAllergens,
          includeCuisines: selectedLikes,
          excludeCuisines: selectedDislikes,
          personalizationSkipped: !preferences.personalizationOptIn || ignorePreferences,
          usedPantryItems: [],
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Recipe search failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function runHungry() {
    setHungryLoading(true);
    setError(null);
    setHasSearched(true);
    prefetchAbortRef.current.generation += 1;

    const hasActiveRandomFilters =
      selectedDiets.length > 0 ||
      selectedAllergens.length > 0 ||
      selectedLikes.length > 0 ||
      selectedDislikes.length > 0;

    const params = new URLSearchParams();
    params.set("number", "12");
    if (selectedDiets.length > 0) params.set("diet", selectedDiets.join(","));
    if (selectedAllergens.length > 0) params.set("intolerances", selectedAllergens.join(","));
    if (selectedLikes.length > 0) params.set("cuisine", selectedLikes.join(","));
    if (selectedDislikes.length > 0) params.set("excludeCuisine", selectedDislikes.join(","));

    try {
      const res = await fetch(`/api/recipes/random?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        const message =
          typeof data?.error === "string"
            ? data.error
            : typeof data?.detail === "string"
              ? data.detail
              : "Could not load random recipes";
        setError(message);
        return;
      }

      let nextResults = Array.isArray(data.results) ? data.results : [];

      // Only fall back to unfiltered random when no filters are active.
      if (nextResults.length === 0 && !hasActiveRandomFilters) {
        try {
          const fallbackRes = await fetch("/api/recipes/random?number=12");
          const fallbackData = await fallbackRes.json();
          if (fallbackRes.ok && Array.isArray(fallbackData.results)) {
            nextResults = fallbackData.results;
          }
        } catch {
          // ignore fallback errors; surface below if still empty
        }
      }

      if (nextResults.length === 0) {
        setError(
          buildNoResultsMessage({
            query: "",
            includeIngredients: [],
            selectedDiets,
            selectedAllergens,
            selectedLikes,
            selectedDislikes,
            debugParams: {},
          }),
        );
      }

      setResults(nextResults);
      if (nextResults.length > 0) {
        const nextGeneration = prefetchAbortRef.current.generation;
        prefetchBatchDetails(
          nextResults.slice(0, 12).map((recipe: NormalizedRecipe) => ({ ...recipe })),
          nextGeneration,
        );
      }
      setMeta({
        totalResults: nextResults.length,
        cached: false,
        appliedPreferences: {
          diet: nextResults.length > 0 ? selectedDiets : [],
          allergens: nextResults.length > 0 ? selectedAllergens : [],
          includeCuisines: nextResults.length > 0 ? selectedLikes : [],
          excludeCuisines: nextResults.length > 0 ? selectedDislikes : [],
          personalizationSkipped: ignorePreferences,
          usedPantryItems: [],
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not load random recipes";
      setError(message);
    } finally {
      setHungryLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-4 lg:self-start">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Filters</CardTitle>
            <CardDescription>
              Check likes, dislikes, allergens, and diet before searching.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4 rounded-xl border bg-background p-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Search setup</p>
                <p className="text-xs text-muted-foreground">
                  Choose ingredient scope, timing, and ranking before searching.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Kitchen ingredients</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setPantryDialogOpen(true)}
                  >
                    Select ingredients
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedPantryItemIds([])}
                    disabled={selectedPantryItems.length === 0}
                  >
                    Clear selected
                  </Button>
                </div>
                {selectedPantryItems.length > 0 ? (
                  <div className="flex max-h-24 flex-wrap gap-2 overflow-y-auto pr-1">
                    {selectedPantryItems.map((item) => (
                      <Badge key={`selected-sidebar-${item.id}`} variant="secondary" className="gap-2">
                        {formatInventoryItemName(item.name)}
                        <button
                          type="button"
                          aria-label={`Remove ${item.name}`}
                          className="inline-flex"
                          onClick={() => togglePantryItem(item.id)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No ingredients selected yet.</p>
                )}
              </div>

              <div className="h-px bg-border" />

              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Pantry matching</p>
                  <p className="text-xs text-muted-foreground">
                    On-hand vs missing is always included in ranking.
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Ready in (minutes)</p>
                    <p className="text-xs text-muted-foreground">Skip long cooks.</p>
                  </div>
                  <Input
                    className="w-24"
                    inputMode="numeric"
                    value={maxReadyTime}
                    onChange={(event) => setMaxReadyTime(event.target.value)}
                    placeholder="30"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Sort</Label>
                  <Select value={sort} onValueChange={setSort}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sort results" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="max-used-ingredients">Use what I have</SelectItem>
                      <SelectItem value="min-missing-ingredients">Minimize missing</SelectItem>
                      <SelectItem value="popularity">Most popular</SelectItem>
                      <SelectItem value="time">Fastest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">Use profile preferences</p>
                    <p className="text-xs text-muted-foreground">Apply your diet, allergens, and cuisine profile.</p>
                  </div>
                  <Switch
                    id="use-profile-preferences"
                    checked={!ignorePreferences}
                    onCheckedChange={(checked) => setIgnorePreferences(!checked)}
                  />
                </div>
              </div>
            </div>

            <DietAllergenGroup
              title="Dietary preferences"
              description="Select eating styles to include."
              options={dietOptions}
              labels={dietLabels}
              selected={selectedDiets}
              onToggle={toggleDiet}
              onClear={() => setSelectedDiets([])}
            />
            <AllergenGroup
              title="Allergens to avoid"
              description="We’ll exclude these."
              options={allergenOptions}
              labels={allergenLabels}
              selected={selectedAllergens}
              onToggle={toggleAllergen}
              onClear={() => setSelectedAllergens([])}
            />
            <CuisineGroup
              title="Cuisine likes"
              description="Boost recipes that match these."
              options={cuisineOptions}
              labels={cuisineLabels}
              selected={selectedLikes}
              onToggle={toggleLike}
              onClear={() => setSelectedLikes([])}
              tone="positive"
            />
            <CuisineGroup
              title="Cuisine dislikes"
              description="Skip these cuisines."
              options={cuisineOptions}
              labels={cuisineLabels}
              selected={selectedDislikes}
              onToggle={toggleDislike}
              onClear={() => setSelectedDislikes([])}
              tone="negative"
            />

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={clearAllFilters}>
                Clear filters
              </Button>
              <Button variant="ghost" size="sm" onClick={resetFiltersToProfile}>
                Reset to profile
              </Button>
            </div>
          </CardContent>
        </Card>
      </aside>

      <div className="flex flex-col gap-4">
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-3">
              <div className="flex w-full flex-1 min-w-0">
                <Input
                  id="query"
                  placeholder="Search recipes (e.g., chicken soup, pesto pasta)"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="w-full min-w-[260px]"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") runSearch();
                  }}
                />
              </div>
              <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:justify-end">
                <Button onClick={runSearch} disabled={loading} className="w-full md:w-auto gap-2">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Searching
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4" />
                      Search
                    </>
                  )}
                </Button>
                <Button
                  variant="secondary"
                  disabled={hungryLoading}
                  className="w-full md:w-auto gap-2"
                  onClick={runHungry}
                >
                  {hungryLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      I’m feeling hungry…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      I’m feeling hungry
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {maxReadyTime && <Badge variant="secondary">Max {maxReadyTime} min</Badge>}
            </div>

            {error && (
              <p className="text-sm text-destructive" role="status">
                {error}
              </p>
            )}
          </CardContent>
        </Card>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <RecipeCardSkeleton key={index} />
            ))}
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-3">
            {meta && (
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                <span>
                  Showing {results.length} of {meta.totalResults} recipes
                  {meta.cached ? " (cached)" : ""}
                </span>
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {results.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            onViewDetails={(currentRecipe) => {
              const recipeSnapshot: NormalizedRecipe = { ...currentRecipe };
              const cached = detailCacheRef.current.get(recipeSnapshot.id);
              setDetailRecipe(recipeSnapshot);
              setDetailInfo(cached ?? recipeSnapshot);
              setDetailOpen(true);
            }}
            onHover={(hoverRecipe) => prefetchRecipeDetails(hoverRecipe)}
          />
        ))}
            </div>
          </div>
        ) : (
          <EmptyState
            hasSearched={hasSearched}
            query={trimmedQuery}
            selectedIngredientCount={selectedPantryItems.length}
            activeFilterCount={
              selectedDiets.length +
              selectedAllergens.length +
              selectedLikes.length +
              selectedDislikes.length +
              (maxReadyTime.trim() ? 1 : 0)
            }
          />
        )}
      </div>

      <Dialog open={pantryDialogOpen} onOpenChange={setPantryDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Select kitchen ingredients</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto pr-2" style={{ maxHeight: "65vh" }}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <Input
                placeholder="Filter ingredients or locations"
                value={pantryFilter}
                onChange={(event) => setPantryFilter(event.target.value)}
                className="md:max-w-sm"
              />
              <div className="flex items-center gap-2">
                <Badge variant="outline">{selectedPantryItems.length} selected</Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedPantryItemIds([])}
                  disabled={selectedPantryItems.length === 0}
                >
                  Clear
                </Button>
                <Button type="button" size="sm" onClick={() => setPantryDialogOpen(false)}>
                  Use selected
                </Button>
              </div>
            </div>

            {pantryError && <p className="text-sm text-destructive">{pantryError}</p>}
            {pantryLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <Skeleton key={`pantry-skeleton-${idx}`} className="h-24 w-full rounded-xl" />
                ))}
              </div>
            ) : filteredPantryLocations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pantry ingredients found for this filter.</p>
            ) : (
              <div className="space-y-4">
                {filteredPantryLocations.map((location) => (
                  <div key={`loc-${location.id}`} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">{location.name}</h3>
                      <span className="text-xs text-muted-foreground">{location.items.length} items</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 justify-items-center md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                      {location.items.map((item) => {
                        const selected = selectedPantryItemIds.includes(item.id);
                        return (
                          <button
                            key={`pantry-item-${item.id}`}
                            type="button"
                            onClick={() => togglePantryItem(item.id)}
                            className="w-full max-w-[190px] text-left focus-visible:outline-none"
                          >
                            <InventoryIngredientCard
                              name={item.name}
                              imageUrl={item.imageUrl}
                              aisle={item.aisle}
                              quantity={item.quantity}
                              unit={item.unit}
                              expiresAt={item.expiresAt}
                              selected={selected}
                              imageClassName="h-28 p-2"
                              imageObjectClassName="object-contain"
                              contentClassName="p-3"
                              badgeContent={
                                selected ? (
                                  <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full border bg-background/90 px-2 py-1 text-xs font-medium text-emerald-700 shadow-sm dark:text-emerald-200">
                                    <Check className="h-3 w-3" />
                                    Selected
                                  </span>
                                ) : undefined
                              }
                              className={cn(
                                "transition",
                                "hover:border-primary focus-visible:ring-2 focus-visible:ring-primary/50",
                              )}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>{detailInfo?.title ?? detailRecipe?.title ?? "Recipe details"}</DialogTitle>
          </DialogHeader>
          {detailRecipe && (
            <div className="space-y-4 overflow-y-auto pr-2" style={{ maxHeight: "65vh" }}>
              {detailInfo?.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={detailInfo.image}
                  alt={detailInfo.title}
                  className="w-full max-h-[420px] rounded-xl bg-muted p-2 object-contain"
                />
              )}
              <MetadataPanel
                totalMinutes={totalMinutes}
                prepMinutes={prepMinutes}
                cookMinutes={cookMinutes}
                servings={servings}
                dietBadges={dietBadges}
                allergenBadges={allergenBadges}
                glutenSafetyWarning={glutenSafetyWarning}
                loading={detailLoading}
              />
              <div className="space-y-4">
                <DetailSectionCard title="Ingredients">
                  {detailLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Skeleton key={`ingredient-skeleton-${idx}`} className="h-4 w-full" />
                      ))}
                    </div>
                  ) : standardizedIngredients ? (
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {standardizedIngredients.map((ing, idx) => {
                        const formattedQuantity = formatQuantity(ing.quantity);
                        return (
                          <li key={`std-ing-${ing.name}-${idx}`}>
                            <span className="font-medium text-foreground">{ing.name}</span>
                            {formattedQuantity && (
                              <span className="ml-2">
                                {formattedQuantity}
                                {ing.unit ? ` ${ing.unit}` : ""}
                              </span>
                            )}
                            {ing.preparation && <span className="ml-1">({ing.preparation})</span>}
                            {ing.notes && <span className="ml-1 text-xs">— {ing.notes}</span>}
                          </li>
                        );
                      })}
                    </ul>
                  ) : detailInfo?.extendedIngredients && detailInfo.extendedIngredients.length > 0 ? (
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {detailInfo.extendedIngredients.map((ing, idx) => (
                        <li key={`ext-${idx}`}>{ing.original || ing.name}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No ingredient list available.</p>
                  )}
                </DetailSectionCard>

                <DetailSectionCard title="Instructions">
                  {detailLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 4 }).map((_, idx) => (
                        <Skeleton key={`instruction-skeleton-${idx}`} className="h-4 w-full" />
                      ))}
                    </div>
                  ) : standardizedSteps ? (
                    <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-outside pl-4">
                      {standardizedSteps.map((step) => (
                        <li key={`std-step-${step.number}`} className="marker:text-muted-foreground">
                          <div className="text-foreground">{step.instruction}</div>
                          {(step.durationMinutes ||
                            (step.ingredients && step.ingredients.length > 0) ||
                            (step.equipment && step.equipment.length > 0) ||
                            step.tips) && (
                            <div className="mt-1 space-y-1 text-xs text-muted-foreground/80">
                              {step.durationMinutes && (
                                <p>Duration: {formatDuration(step.durationMinutes)}</p>
                              )}
                              {step.ingredients && step.ingredients.length > 0 && (
                                <p>Ingredients: {step.ingredients.join(", ")}</p>
                              )}
                              {step.equipment && step.equipment.length > 0 && (
                                <p>Equipment: {step.equipment.join(", ")}</p>
                              )}
                              {step.tips && <p>Tip: {step.tips}</p>}
                            </div>
                          )}
                        </li>
                      ))}
                    </ol>
                  ) : fallbackInstructions.length > 0 ? (
                    <ol className="space-y-1 text-sm text-muted-foreground list-decimal list-outside pl-4">
                      {fallbackInstructions.map((step, idx) => (
                        <li key={`step-${idx}`} className="marker:text-muted-foreground">
                          <div className="text-foreground">{step}</div>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-sm text-muted-foreground">No instructions provided.</p>
                  )}
                </DetailSectionCard>

                <DetailSectionCard title="Pantry match">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">On hand</p>
                      {detailInfo?.ingredientMatch?.have && detailInfo.ingredientMatch.have.length > 0 ? (
                        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                          {detailInfo.ingredientMatch.have.map((ing) => (
                            <li key={`used-${ing.original}`}>{ing.original || ing.name}</li>
                          ))}
                        </ul>
                      ) : detailInfo?.usedIngredients && detailInfo.usedIngredients.length > 0 ? (
                        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                          {detailInfo.usedIngredients.map((ing) => (
                            <li key={`used-fallback-${ing.original}`}>{ing.original || ing.name}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">No pantry items used.</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Still need</p>
                      {detailInfo?.ingredientMatch?.missing && detailInfo.ingredientMatch.missing.length > 0 ? (
                        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                          {detailInfo.ingredientMatch.missing.map((ing) => (
                            <li key={`miss-${ing.original}`}>{ing.original || ing.name}</li>
                          ))}
                        </ul>
                      ) : detailInfo?.missedIngredients && detailInfo.missedIngredients.length > 0 ? (
                        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                          {detailInfo.missedIngredients.map((ing) => (
                            <li key={`miss-fallback-${ing.original}`}>{ing.original || ing.name}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">Everything is in your kitchen.</p>
                      )}
                    </div>
                  </div>
                </DetailSectionCard>

                {showNutrition && nutritionSnapshot && (
                  <DetailSectionCard title="Nutrition">
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {"calories" in nutritionSnapshot && typeof nutritionSnapshot.calories === "number" && (
                        <li>Calories: {Math.round(nutritionSnapshot.calories)}</li>
                      )}
                      {"proteinGrams" in nutritionSnapshot &&
                        typeof nutritionSnapshot.proteinGrams === "number" && (
                          <li>Protein: {nutritionSnapshot.proteinGrams} g</li>
                        )}
                      {"carbsGrams" in nutritionSnapshot &&
                        typeof nutritionSnapshot.carbsGrams === "number" && (
                          <li>Carbs: {nutritionSnapshot.carbsGrams} g</li>
                        )}
                      {"fatGrams" in nutritionSnapshot && typeof nutritionSnapshot.fatGrams === "number" && (
                        <li>Fat: {nutritionSnapshot.fatGrams} g</li>
                      )}
                    </ul>
                  </DetailSectionCard>
                )}

                {detailStandardized?.notes && detailStandardized.notes.length > 0 && (
                  <DetailSectionCard title="Notes">
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {detailStandardized.notes.map((note, idx) => (
                        <li key={`note-${idx}`}>{note}</li>
                      ))}
                    </ul>
                  </DetailSectionCard>
                )}
              </div>

              {detailRecipe?.sourceUrl && (
                <Button asChild variant="ghost" className="gap-2">
                  <a href={detailRecipe.sourceUrl} target="_blank" rel="noreferrer">
                    View source
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DietAllergenGroup({
  title,
  description,
  options,
  labels,
  selected,
  onToggle,
  onClear,
}: {
  title: string;
  description: string;
  options: string[];
  labels: Record<string, string>;
  selected: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
}) {
  const sorted = useMemo(() => options.slice().sort((a, b) => (labels[a] ?? a).localeCompare(labels[b] ?? b)), [options, labels]);

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={onClear}>
          Clear
        </Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {sorted.map((value) => {
          const id = `${title}-${value}`;
          const checked = selected.includes(value);
          return (
            <label
              key={value}
              htmlFor={id}
              className={cn(
                "flex items-center gap-3 rounded-lg border border-border bg-background/70 p-3 text-sm transition",
                "hover:border-emerald-500",
                checked && "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
              )}
            >
              <Checkbox id={id} checked={checked} onCheckedChange={() => onToggle(value)} />
              <span className="font-medium">{labels[value] ?? value}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function AllergenGroup({
  title,
  description,
  options,
  labels,
  selected,
  onToggle,
  onClear,
}: {
  title: string;
  description: string;
  options: string[];
  labels: Record<string, string>;
  selected: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
}) {
  const sorted = useMemo(
    () => options.slice().sort((a, b) => (labels[a] ?? a).localeCompare(labels[b] ?? b)),
    [options, labels],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={onClear}>
          Clear
        </Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {sorted.map((value) => {
          const isSelected = selected.includes(value);
          const id = `${title}-${value}`;
          return (
            <label
              key={id}
              htmlFor={id}
              className={cn(
                "flex items-center gap-3 rounded-lg border border-border bg-background/70 p-3 text-sm transition hover:border-rose-500",
                isSelected && "border-rose-500 bg-rose-500/5",
              )}
            >
              <Checkbox
                id={id}
                checked={isSelected}
                checkedClassName="data-[state=checked]:border-rose-500 data-[state=checked]:bg-rose-500 data-[state=checked]:text-white"
                focusRingClassName="focus-visible:ring-rose-500"
                indicatorClassName="text-white"
                indicatorIcon={X}
                onCheckedChange={() => onToggle(value)}
              />
              <span className={cn("font-medium", isSelected && "text-rose-700 dark:text-rose-200")}>
                {labels[value] ?? value}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function CuisineGroup({
  title,
  description,
  options,
  labels,
  selected,
  onToggle,
  onClear,
  tone = "positive",
}: {
  title: string;
  description: string;
  options: string[];
  labels: Record<string, string>;
  selected: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
  tone?: "positive" | "negative";
}) {
  const sorted = useMemo(() => options.slice().sort((a, b) => (labels[a] ?? a).localeCompare(labels[b] ?? b)), [options, labels]);

  const toneClasses =
    tone === "positive"
      ? {
          border: "border-emerald-500",
          bg: "bg-emerald-500/10",
          text: "text-emerald-700 dark:text-emerald-200",
          hover: "hover:border-emerald-500 hover:text-emerald-600",
        }
      : {
          border: "border-red-500",
          bg: "bg-red-500/10",
          text: "text-red-700 dark:text-red-200",
          hover: "hover:border-red-500 hover:text-red-600",
        };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={onClear}>
          Clear
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {sorted.map((value) => {
          const isSelected = selected.includes(value);
          return (
            <button
              key={`${title}-${value}`}
              type="button"
              onClick={() => onToggle(value)}
              className={cn(
                "rounded-full border border-border bg-background px-4 py-1.5 text-sm font-medium shadow-xs transition",
                toneClasses.hover,
                isSelected && `${toneClasses.border} ${toneClasses.bg} ${toneClasses.text} shadow-sm`,
              )}
            >
              {labels[value] ?? value}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function buildNoResultsMessage({
  query,
  includeIngredients,
  selectedDiets,
  selectedAllergens,
  selectedLikes,
  selectedDislikes,
  debugParams,
}: {
  query: string;
  includeIngredients: string[];
  selectedDiets: string[];
  selectedAllergens: string[];
  selectedLikes: string[];
  selectedDislikes: string[];
  debugParams: Record<string, string>;
}) {
  const normalizedQuery = query.trim().toLowerCase();
  const activeAllergenConflicts = detectAllergenQueryConflicts(normalizedQuery, selectedAllergens);
  const hasIngredientConstraints =
    includeIngredients.length > 0 || typeof debugParams.includeIngredients === "string";
  const hasFilterConstraints =
    selectedDiets.length > 0 ||
    selectedAllergens.length > 0 ||
    selectedLikes.length > 0 ||
    selectedDislikes.length > 0;

  if (activeAllergenConflicts.length > 0) {
    const listed = activeAllergenConflicts.join(", ");
    if (query.trim().length > 0) {
      return `No recipes found. Your search for "${query.trim()}" conflicts with your ${listed} allergen filter. Try a different keyword, or remove that allergen filter and search again.`;
    }
    return `No recipes found. Your active allergen filter (${listed}) is very restrictive. Try removing one allergen filter and search again.`;
  }

  if (hasIngredientConstraints && hasFilterConstraints) {
    return "No recipes found. Your selected ingredients and filters are too restrictive together. Try removing one ingredient or loosening one filter.";
  }
  if (hasIngredientConstraints) {
    return "No recipes found. Your selected ingredients are too specific. Try selecting fewer ingredients or using a broader ingredient.";
  }
  if (hasFilterConstraints) {
    return "No recipes found. Your active filters are too restrictive. Try removing one filter and search again.";
  }
  if (query.trim().length > 0) {
    return `No recipes found for "${query.trim()}". Try a broader keyword and search again.`;
  }
  return "No recipes found. Try adding a keyword or selecting ingredients.";
}

function detectAllergenQueryConflicts(query: string, allergens: string[]): string[] {
  if (!query) return [];
  const normalized = allergens.map((value) => value.trim().toLowerCase());
  const conflicts: string[] = [];

  if (normalized.includes("eggs") && /\begg(s)?\b|\bmayo\b|\bmayonnaise\b/.test(query)) conflicts.push("egg");
  if (normalized.includes("peanuts") && /\bpeanut(s)?\b|\bpeanut butter\b/.test(query)) conflicts.push("peanut");
  if (normalized.includes("tree_nuts") && /\bnut(s)?\b|\balmond(s)?\b|\bcashew(s)?\b|\bwalnut(s)?\b/.test(query)) {
    conflicts.push("tree nuts");
  }
  if (normalized.includes("dairy") && /\bcheese\b|\bmilk\b|\bbutter\b|\bcream\b|\byogurt\b/.test(query)) {
    conflicts.push("dairy");
  }
  if (normalized.includes("soy") && /\bsoy\b|\btofu\b|\btempeh\b|\bedamame\b/.test(query)) conflicts.push("soy");
  if (normalized.includes("wheat") && /\bwheat\b|\bbread\b|\bflour\b|\bpasta\b/.test(query)) conflicts.push("wheat");
  if (normalized.includes("sesame") && /\bsesame\b|\btahini\b/.test(query)) conflicts.push("sesame");
  if (normalized.includes("shellfish") && /\bshrimp\b|\bcrab\b|\blobster\b|\bclam\b|\boyster\b/.test(query)) {
    conflicts.push("shellfish");
  }

  return conflicts;
}

function EmptyState({
  hasSearched,
  query,
  selectedIngredientCount,
  activeFilterCount,
}: {
  hasSearched: boolean;
  query: string;
  selectedIngredientCount: number;
  activeFilterCount: number;
}) {
  const hasConstraints = selectedIngredientCount > 0 || activeFilterCount > 0 || query.trim().length > 0;
  const title = hasSearched ? "No recipes found" : "Find recipes";
  const message = hasSearched
    ? hasConstraints
      ? "Try a broader keyword, fewer selected ingredients, or fewer filters and search again."
      : "Try adding a keyword or selecting ingredients and search again."
    : "Start with a keyword like \"pasta\", select ingredients from your kitchen inventory, or tap \"I'm feeling hungry\" for a random pick.";

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-start gap-3 py-8">
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription className="max-w-2xl">{message}</CardDescription>
      </CardContent>
    </Card>
  );
}

function DetailSectionCard({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">{children}</CardContent>
    </Card>
  );
}

function MetadataPanel({
  totalMinutes,
  prepMinutes,
  cookMinutes,
  servings,
  dietBadges,
  allergenBadges,
  glutenSafetyWarning,
  loading = false,
}: {
  totalMinutes: number | null;
  prepMinutes: number | null;
  cookMinutes: number | null;
  servings: number | null;
  dietBadges: string[];
  allergenBadges: string[];
  glutenSafetyWarning: { shouldWarn: boolean; matches: string[] };
  loading?: boolean;
}) {
  const hasTiming = Boolean(totalMinutes || prepMinutes || cookMinutes || servings);
  const hasBadges = dietBadges.length > 0 || allergenBadges.length > 0;
  const shouldRender = loading || hasTiming || hasBadges;
  if (!shouldRender) return null;

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-3 shadow-sm">
      {loading ? (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 3 }).map((_, idx) => (
            <Skeleton key={`meta-pill-${idx}`} className="h-7 w-28 rounded-full" />
          ))}
        </div>
      ) : hasTiming ? (
        <div className="flex flex-wrap gap-2">
          {totalMinutes && (
            <MetricPill label="Total" value={`${totalMinutes} min`} icon={Timer} tone="accent" />
          )}
          {prepMinutes && <MetricPill label="Prep" value={`${prepMinutes} min`} />}
          {cookMinutes && <MetricPill label="Cook" value={`${cookMinutes} min`} />}
          {servings && <MetricPill label="Serves" value={String(servings)} />}
        </div>
      ) : null}
      {loading ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {Array.from({ length: 3 }).map((_, idx) => (
            <Skeleton key={`meta-tag-${idx}`} className="h-5 w-20 rounded-full" />
          ))}
        </div>
      ) : hasBadges ? (
        <div className={cn("flex flex-wrap gap-2 text-xs", hasTiming && "mt-2")}>
          {dietBadges.map((tag) => (
            <RecipeTagReferenceBadge
              key={`diet-${tag}`}
              tag={tag}
              variant="outline"
              warningTitle={
                tag.toLowerCase() === "gluten free" && glutenSafetyWarning.shouldWarn
                  ? "Gluten caution"
                  : null
              }
              warningItems={
                tag.toLowerCase() === "gluten free" && glutenSafetyWarning.shouldWarn
                  ? glutenSafetyWarning.matches
                  : []
              }
              warningNote={
                tag.toLowerCase() === "gluten free" && glutenSafetyWarning.shouldWarn
                  ? "Verify product labels for certified gluten-free versions."
                  : null
              }
            />
          ))}
          {allergenBadges.map((tag) => (
            <RecipeTagReferenceBadge key={`allergen-${tag}`} tag={tag} variant="secondary" />
          ))}
        </div>
      ) : null}
      {!hasTiming && !hasBadges && loading && (
        <Skeleton className="mt-2 h-4 w-32 rounded-full" />
      )}
    </div>
  );
}

function MetricPill({
  label,
  value,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  icon?: typeof Timer;
  tone?: "neutral" | "accent";
}) {
  const toneClasses =
    tone === "accent"
      ? "bg-primary/10 text-primary border-primary/30"
      : "bg-muted/70 text-muted-foreground border-border";
  return (
    <div className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${toneClasses}`}>
      {Icon && <Icon className="h-3.5 w-3.5" />}
      <div className="flex flex-col leading-tight">
        <span className="uppercase tracking-wide text-[10px]">{label}</span>
        <span className="font-semibold text-sm text-foreground">{value}</span>
      </div>
    </div>
  );
}


function formatQuantity(quantity?: number | null) {
  if (typeof quantity !== "number" || Number.isNaN(quantity)) return null;
  if (Number.isInteger(quantity)) return quantity.toString();
  return quantity.toFixed(2).replace(/\.00$/, "");
}

function formatDuration(minutes?: number | null) {
  if (typeof minutes !== "number" || Number.isNaN(minutes)) return null;
  if (minutes >= 60) {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins ? `${hrs} hr ${mins} min` : `${hrs} hr`;
  }
  return `${minutes} min`;
}

function hasNutritionData(value: Record<string, unknown>) {
  return Object.values(value).some((entry) => typeof entry === "number" && Number.isFinite(entry));
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, "");
}

function formatInstructions(raw: string): string[] {
  const cleaned = stripHtml(raw)
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (cleaned.length > 0) return cleaned;
  return [raw.trim()];
}
