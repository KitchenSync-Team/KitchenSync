"use client";

import { useMemo, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

import {
  ALLERGEN_OPTIONS,
  CUISINE_PREFERENCE_OPTIONS,
  DIETARY_OPTIONS,
} from "@/app/protected/onboarding/constants";
import { IngredientCard } from "@/components/ingredients/ingredient-card";
import { IngredientCardSkeleton } from "@/components/ingredients/ingredient-skeleton";
import { AddIngredientSheet } from "@/components/ingredients/add-ingredient-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { IngredientSearchResponse, IngredientSearchResult } from "@/lib/ingredients/types";
import type { UserPreferencesSummary } from "@/lib/domain/kitchen";

type LocationOption = { id: string; name: string; icon?: string | null };
type UnitOption = { id: string; name: string; abbreviation?: string | null; type: string };

type RecentEntry = {
  name: string;
  quantity: number;
  locationName?: string;
  createdAt: number;
};

export function IngredientClient({
  kitchenId,
  locations,
  units,
  preferences,
}: {
  kitchenId: string;
  locations: LocationOption[];
  units: UnitOption[];
  preferences: UserPreferencesSummary;
}) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<IngredientSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selected, setSelected] = useState<IngredientSearchResult | null>(null);
  const [recent, setRecent] = useState<RecentEntry[]>([]);
  const [cached, setCached] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<{
    possibleUnits?: string[];
    image?: string | null;
    aisle?: string | null;
    nutrition?: unknown;
  }>({});

  const allergenMap = useMemo(
    () => Object.fromEntries(ALLERGEN_OPTIONS.map((option) => [option.value, option.label])),
    [],
  );
  const dietMap = useMemo(
    () => Object.fromEntries(DIETARY_OPTIONS.map((option) => [option.value, option.label])),
    [],
  );
  const cuisineMap = useMemo(
    () => Object.fromEntries(CUISINE_PREFERENCE_OPTIONS.map((option) => [option.value, option.label])),
    [],
  );

  async function runSearch() {
    if (!query.trim()) {
      setError("Enter an ingredient to search.");
      return;
    }
    setLoading(true);
    setError(null);
    setCached(false);
    try {
      const res = await fetch("/api/ingredients/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      const data = (await res.json()) as Partial<IngredientSearchResponse> & Record<string, unknown>;
      if (!res.ok) {
        const message =
          typeof data.error === "string" ? data.error : typeof data.detail === "string" ? data.detail : "Search failed";
        setError(message);
        return;
      }
      setResults(Array.isArray(data.results) ? data.results : []);
      setCached(data.cached === true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Search failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function handleAddSuccess(entry: { name: string; quantity: number; locationId?: string | null }) {
    const locName = locations.find((loc) => loc.id === entry.locationId)?.name;
    setRecent((current) => [
      { name: entry.name, quantity: entry.quantity, locationName: locName, createdAt: Date.now() },
      ...current,
    ].slice(0, 5));
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="gap-2">
          <CardTitle>Search ingredients</CardTitle>
          <CardDescription>Find pantry items by name and add them to your locations.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-2">
            <Label htmlFor="ingredient-query">Ingredient</Label>
            <Input
              id="ingredient-query"
              placeholder="tomato, basil, almond milk..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  runSearch();
                }
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={runSearch} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching
                </>
              ) : (
                "Search"
              )}
            </Button>
            {cached && (
              <Badge variant="outline" className="gap-1">
                <Sparkles className="h-3 w-3" />
                Cached
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <PreferenceBadges
        diets={preferences.dietaryPreferences}
        allergens={preferences.allergens}
        cuisines={{
          likes: preferences.cuisineLikes,
          dislikes: preferences.cuisineDislikes,
        }}
        dietMap={dietMap}
        allergenMap={allergenMap}
        cuisineMap={cuisineMap}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <IngredientCardSkeleton key={idx} />
          ))}
        </div>
      ) : results.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((ingredient) => (
            <IngredientCard
              key={ingredient.id}
              ingredient={ingredient}
              onAdd={async () => {
                setSelected(ingredient);
                setSheetOpen(true);
                try {
                  const res = await fetch(`/api/ingredients/${ingredient.id}`);
                  const data = await res.json();
                  if (res.ok) {
                    setSelectedDetail({
                      possibleUnits: Array.isArray(data.possibleUnits)
                        ? (data.possibleUnits as unknown[]).filter(
                            (value): value is string => typeof value === "string",
                          )
                        : undefined,
                      image: typeof data.image === "string" ? data.image : ingredient.image,
                      aisle: typeof data.aisle === "string" ? data.aisle : ingredient.aisle,
                      nutrition: data.nutrition,
                    });
                  }
                } catch {
                  setSelectedDetail({});
                }
              }}
            />
          ))}
        </div>
      ) : (
        <EmptyState />
      )}

      <RecentList entries={recent} />

      <AddIngredientSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        selection={
          selected
            ? {
                name: selected.name,
                id: selected.id,
                source: "spoonacular",
                catalogType: "ingredient",
                imageUrl: selectedDetail.image ?? selected.image ?? undefined,
                aisle: selectedDetail.aisle ?? selected.aisle ?? undefined,
                possibleUnits: selectedDetail.possibleUnits,
              }
            : null
        }
        kitchenId={kitchenId}
        locations={locations}
        units={units}
        suggestedUnits={selectedDetail?.possibleUnits}
        onSuccess={handleAddSuccess}
      />
    </div>
  );
}

function PreferenceBadges({
  diets,
  allergens,
  cuisines,
  dietMap,
  allergenMap,
  cuisineMap,
}: {
  diets: string[];
  allergens: string[];
  cuisines: { likes: string[]; dislikes: string[] };
  dietMap: Record<string, string>;
  allergenMap: Record<string, string>;
  cuisineMap: Record<string, string>;
}) {
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-2 py-4 text-sm">
        <Badge variant="secondary">Diet</Badge>
        {diets.length > 0 ? (
          diets.map((diet) => (
            <Badge key={diet} variant="outline">
              {dietMap[diet] ?? toTitle(diet)}
            </Badge>
          ))
        ) : (
          <span className="text-muted-foreground">None</span>
        )}
        <Badge variant="secondary" className="ml-3">
          Allergens
        </Badge>
        {allergens.length > 0 ? (
          allergens.map((allergen) => (
            <Badge key={allergen} variant="outline" className="border-red-300 text-red-900 dark:border-red-800 dark:text-red-200">
              {allergenMap[allergen] ?? toTitle(allergen)}
            </Badge>
          ))
        ) : (
          <span className="text-muted-foreground">None</span>
        )}
        <Badge variant="secondary" className="ml-3">
          Cuisines
        </Badge>
        {cuisines.likes.length + cuisines.dislikes.length > 0 ? (
          <>
            {cuisines.likes.map((cuisine) => (
              <Badge key={`like-${cuisine}`} variant="outline" className="border-blue-300 text-blue-900 dark:border-blue-800 dark:text-blue-200">
                Like: {cuisineMap[cuisine] ?? toTitle(cuisine)}
              </Badge>
            ))}
            {cuisines.dislikes.map((cuisine) => (
              <Badge key={`avoid-${cuisine}`} variant="outline" className="border-amber-300 text-amber-900 dark:border-amber-800 dark:text-amber-200">
                Avoid: {cuisineMap[cuisine] ?? toTitle(cuisine)}
              </Badge>
            ))}
          </>
        ) : (
          <span className="text-muted-foreground">None</span>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col gap-3 py-8">
        <Badge variant="outline">Ingredients</Badge>
        <CardTitle className="text-lg">Search ingredients to add to your kitchen</CardTitle>
        <CardDescription className="max-w-2xl">
          Find pantry staples or produce, then add them directly to your kitchen locations with quantity and expiration.
        </CardDescription>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">Uses preferences</Badge>
          <Badge variant="secondary">Quick add</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentList({ entries }: { entries: RecentEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base">Recently added</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2 text-sm">
        {entries.map((entry) => (
          <Badge key={entry.createdAt} variant="outline">
            {entry.quantity}× {entry.name}
            {entry.locationName ? ` • ${entry.locationName}` : ""}
          </Badge>
        ))}
      </CardContent>
    </Card>
  );
}

function toTitle(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}
