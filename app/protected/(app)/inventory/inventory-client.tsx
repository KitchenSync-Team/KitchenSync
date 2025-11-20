"use client";

import { useState } from "react";
import { Loader2, Package, Search, ShoppingBag, Warehouse } from "lucide-react";

import { AddIngredientSheet } from "@/components/ingredients/add-ingredient-sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/supabase/utils";

type UnitOption = { id: string; name: string; abbreviation?: string | null; type: string };
type LocationItem = {
  id: string;
  itemName: string;
  quantity: number;
  unit: string | null;
  expiresAt: string | null;
};
type LocationBucket = {
  id: string;
  name: string;
  icon?: string | null;
  inventory: LocationItem[];
};

type IngredientResult = { id: number; name: string; image: string | null; aisle: string | null };
type GroceryResult = { id: number; title: string; image: string | null };

export function InventoryClient({
  kitchenId,
  units,
  locations,
}: {
  kitchenId: string;
  units: UnitOption[];
  locations: LocationBucket[];
}) {
  const [mode, setMode] = useState<"ingredients" | "groceries">("ingredients");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const [ingredientResults, setIngredientResults] = useState<IngredientResult[]>([]);
  const [groceryResults, setGroceryResults] = useState<GroceryResult[]>([]);
  const [selected, setSelected] = useState<{
    name: string;
    brand?: string;
    id?: number;
    source?: string;
    imageUrl?: string;
    aisle?: string;
    possibleUnits?: string[];
  } | null>(null);
  const [suggestedUnits, setSuggestedUnits] = useState<string[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [buckets, setBuckets] = useState<LocationBucket[]>(locations);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailContent, setDetailContent] = useState<{
    title: string;
    image?: string | null;
    aisle?: string | null;
    possibleUnits?: string[];
    badges?: string[];
    ingredientList?: string;
    nutrition?: { nutrients?: { name: string; amount?: number; unit?: string }[] };
    type: "ingredient" | "grocery";
  } | null>(null);

  async function runSearch() {
    if (!query.trim()) {
      setError("Enter an item to search.");
      return;
    }
    setLoading(true);
    setError(null);
    setCached(false);
    try {
      const endpoint =
        mode === "ingredients" ? "/api/ingredients/search" : "/api/groceries/search";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        const message =
          typeof data.error === "string"
            ? data.error
            : typeof data.detail === "string"
              ? data.detail
              : "Search failed";
        setError(message);
        return;
      }

      const list = Array.isArray(data.results)
        ? (data.results as unknown[])
        : Array.isArray((data as { products?: unknown }).products)
          ? ((data as { products?: unknown }).products as unknown[])
          : [];

      if (mode === "ingredients") {
        const mapped = list
          .map((row) => {
            if (!row || typeof row !== "object") return null;
            const r = row as IngredientResult;
            return {
              id: r.id,
              name: (r as { name?: string }).name ?? "",
              image: (r as { image?: string | null }).image ?? null,
              aisle: (r as { aisle?: string | null }).aisle ?? null,
            };
          })
          .filter(
            (r): r is IngredientResult =>
              r !== null && Number.isFinite(r.id) && Boolean(r.name),
          );
        setIngredientResults(mapped);
      } else {
        const mapped = list
          .map((row) => {
            if (!row || typeof row !== "object") return null;
            const r = row as GroceryResult;
            const title = (r as { title?: string }).title ?? "";
            return { id: r.id, title, image: (r as { image?: string | null }).image ?? null };
          })
          .filter((r): r is GroceryResult => Boolean(r?.id) && Boolean(r?.title));
        setGroceryResults(mapped);
      }
      setCached(Boolean((data as { cached?: boolean }).cached));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Search failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function handleAddSelection(
    target: { name: string; brand?: string; id?: number; imageUrl?: string; aisle?: string },
    source: "ingredient" | "grocery",
  ) {
    setSelected({ ...target, source: "spoonacular" });
    setSuggestedUnits([]);
    if (source === "ingredient" && target.id) {
      void (async () => {
        try {
          const res = await fetch(`/api/ingredients/${target.id}`);
          const data = await res.json();
          if (res.ok) {
            const unitList = Array.isArray(data.possibleUnits)
              ? (data.possibleUnits as unknown[]).filter(
                  (value): value is string => typeof value === "string",
                )
              : [];
            setSuggestedUnits(unitList);
            setSelected((current) =>
              current
                ? {
                    ...current,
                    possibleUnits: unitList,
                    imageUrl:
                      (typeof data.image === "string" ? data.image : undefined) ??
                      current.imageUrl,
                    aisle:
                      (typeof data.aisle === "string" ? data.aisle : undefined) ??
                      current.aisle,
                  }
                : current,
            );
          }
        } catch {
          // ignore
        }
      })();
    }
    setSheetOpen(true);
  }

  async function handleViewDetails(item: IngredientResult | GroceryResult, type: "ingredient" | "grocery") {
    if (type === "ingredient") {
      try {
        const res = await fetch(`/api/ingredients/${item.id}`);
        const data = await res.json();
        const possibleUnits = Array.isArray(data.possibleUnits)
          ? (data.possibleUnits as unknown[]).filter((value): value is string => typeof value === "string")
          : [];
        setDetailContent({
          title: "name" in item ? item.name : "",
          image: typeof data.image === "string" ? data.image : item.image,
          aisle: typeof data.aisle === "string" ? data.aisle : ("aisle" in item ? item.aisle ?? null : null),
          possibleUnits,
          nutrition: typeof data.nutrition === "object" ? data.nutrition : undefined,
          type: "ingredient",
        });
        setDetailOpen(true);
      } catch (err) {
        console.error("Detail fetch error:", err);
        setDetailContent({
          title: "name" in item ? item.name : "",
          image: item.image,
          aisle: "aisle" in item ? item.aisle ?? null : null,
          possibleUnits: [],
          type: "ingredient",
        });
      }
    } else {
      try {
        const res = await fetch(`/api/groceries/${item.id}`);
        const data = await res.json();
        setDetailContent({
          title: (item as GroceryResult).title,
          image: typeof data.image === "string" ? data.image : (item as GroceryResult).image,
          aisle: typeof data.aisle === "string" ? data.aisle : null,
          possibleUnits: undefined,
          badges: Array.isArray(data.badges)
            ? (data.badges as unknown[]).filter((v): v is string => typeof v === "string")
            : undefined,
          ingredientList: typeof data.ingredientList === "string" ? data.ingredientList : undefined,
          nutrition: typeof data.nutrition === "object" ? data.nutrition : undefined,
          type: "grocery",
        });
      } catch (err) {
        console.error("Grocery detail fetch error:", err);
        setDetailContent({
          title: (item as GroceryResult).title,
          image: (item as GroceryResult).image,
          aisle: null,
          possibleUnits: undefined,
          type: "grocery",
        });
      }
      setDetailOpen(true);
    }
  }

  function handleAddSuccess(entry: { name: string; quantity: number; locationId?: string | null; unitLabel?: string | null }) {
    if (!entry.locationId) return;
    const unitLabel = entry.unitLabel ?? null;
    setBuckets((current) =>
      current.map((bucket) =>
        bucket.id === entry.locationId
          ? {
              ...bucket,
              inventory: [
                {
                  id: String(Date.now()),
                  itemName: entry.name,
                  quantity: entry.quantity,
                  unit: unitLabel,
                  expiresAt: null,
                },
                ...bucket.inventory,
              ],
            }
          : bucket,
      ),
    );
  }

  const activeResults = mode === "ingredients" ? ingredientResults : groceryResults;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Search & add</CardTitle>
          <CardDescription>Use Spoonacular to find ingredients or groceries, then add them to a location.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3">
            <Tabs value={mode} onValueChange={(value) => setMode(value as "ingredients" | "groceries")}>
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
                <TabsTrigger value="groceries">Groceries</TabsTrigger>
              </TabsList>
              <TabsContent value="ingredients" className="mt-3 flex flex-col gap-3">
                <SearchBar
                  query={query}
                  onQueryChange={setQuery}
                  onSearch={runSearch}
                  loading={loading}
                  cached={cached}
                />
              </TabsContent>
              <TabsContent value="groceries" className="mt-3 flex flex-col gap-3">
                <SearchBar
                  query={query}
                  onQueryChange={setQuery}
                  onSearch={runSearch}
                  loading={loading}
                  cached={cached}
                />
              </TabsContent>
            </Tabs>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <Card key={idx} className="h-40 animate-pulse bg-muted" />
              ))}
            </div>
          ) : activeResults.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {activeResults.map((item) =>
                mode === "ingredients" ? (
                  <ResultCard
                    key={`ing-${(item as IngredientResult).id}`}
                    title={(item as IngredientResult).name}
                    image={(item as IngredientResult).image}
                    meta={(item as IngredientResult).aisle ?? undefined}
              icon="ingredient"
              onAdd={() =>
                handleAddSelection(
                  {
                    name: (item as IngredientResult).name,
                    id: (item as IngredientResult).id,
                    imageUrl: (item as IngredientResult).image ?? undefined,
                    aisle: (item as IngredientResult).aisle ?? undefined,
                  },
                  "ingredient",
                )
              }
              onView={() => handleViewDetails(item as IngredientResult, "ingredient")}
                  />
                ) : (
                  <ResultCard
                    key={`gro-${(item as GroceryResult).id}`}
                    title={(item as GroceryResult).title}
                    image={(item as GroceryResult).image}
              icon="grocery"
              onAdd={() =>
                handleAddSelection(
                  {
                    name: (item as GroceryResult).title,
                    id: (item as GroceryResult).id,
                    imageUrl: (item as GroceryResult).image ?? undefined,
                  },
                  "grocery",
                )
              }
              onView={() => handleViewDetails(item as GroceryResult, "grocery")}
                  />
                ),
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Search to see results.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manage by location</CardTitle>
          <CardDescription>Review what is in each storage area.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {buckets.map((location) => (
            <div key={location.id} className="rounded-lg border p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn("flex h-8 w-8 items-center justify-center rounded-full bg-muted")}>
                    <Warehouse className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{location.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {location.inventory.length} item{location.inventory.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
              </div>
              {location.inventory.length === 0 ? (
                <p className="text-sm text-muted-foreground">No items here yet.</p>
              ) : (
                <div className="space-y-2">
                  {location.inventory.slice(0, 6).map((item) => (
                    <div
                      key={`${location.id}-${item.id}`}
                      className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{item.itemName}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.quantity}
                            {item.unit ? ` ${item.unit}` : ""}{" "}
                            {item.expiresAt ? `- Expires ${item.expiresAt}` : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {location.inventory.length > 6 && (
                    <p className="text-xs text-muted-foreground">
                      +{location.inventory.length - 6} more in this location
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <AddIngredientSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        selection={selected}
        kitchenId={kitchenId}
        locations={locations.map((loc) => ({ id: loc.id, name: loc.name }))}
        units={units}
        suggestedUnits={suggestedUnits}
        onSuccess={handleAddSuccess}
      />

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{detailContent?.title ?? "Details"}</DialogTitle>
            {detailContent?.aisle && (
              <p className="text-sm text-muted-foreground">Aisle: {detailContent.aisle}</p>
            )}
          </DialogHeader>
          <div className="space-y-3">
            {detailContent?.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={detailContent.image}
                alt={detailContent.title}
                className="h-44 w-full rounded-md object-cover"
              />
            )}
            {detailContent?.badges && detailContent.badges.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Badges</p>
                <div className="flex flex-wrap gap-2">
                  {detailContent.badges.slice(0, 12).map((badge) => (
                    <span
                      key={badge}
                      className="rounded-full border px-2 py-1 text-xs text-muted-foreground"
                    >
                      {badge.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {detailContent?.possibleUnits && detailContent.possibleUnits.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Possible units</p>
                <div className="flex flex-wrap gap-2">
                  {detailContent.possibleUnits.slice(0, 10).map((unit) => (
                    <span
                      key={unit}
                      className="rounded-full border px-2 py-1 text-xs text-muted-foreground"
                    >
                      {unit}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {detailContent?.ingredientList && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Ingredients</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {detailContent.ingredientList}
                </p>
              </div>
            )}
            {detailContent?.nutrition && Array.isArray((detailContent.nutrition as { nutrients?: unknown }).nutrients) && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Nutrition (per serving)</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  {((detailContent.nutrition as { nutrients?: unknown }).nutrients as unknown[])
                    .filter((n): n is { name?: string; amount?: number; unit?: string } => !!n && typeof n === "object")
                    .slice(0, 6)
                    .map((n) => (
                      <div key={`${n.name}-${n.unit ?? ""}`} className="flex items-center justify-between">
                        <span>{n.name}</span>
                        <span>
                          {typeof n.amount === "number" ? Math.round(n.amount * 100) / 100 : "-"}
                          {n.unit ? ` ${n.unit}` : ""}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
            {!detailContent?.possibleUnits &&
              !detailContent?.badges &&
              !detailContent?.ingredientList &&
              !detailContent?.nutrition && (
                <p className="text-sm text-muted-foreground">
                  No additional details available from Spoonacular for this item.
                </p>
              )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SearchBar({
  query,
  onQueryChange,
  onSearch,
  loading,
  cached,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  onSearch: () => void;
  loading: boolean;
  cached: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="flex flex-1 flex-col gap-2">
        <Label htmlFor="inventory-search">Find items</Label>
        <Input
          id="inventory-search"
          placeholder={'milk, pasta, "greek yogurt"...'}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSearch();
            }
          }}
        />
      </div>
      <Button onClick={onSearch} disabled={loading} className="gap-2">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        Search
      </Button>
      {cached && <span className="text-xs text-muted-foreground">Cached</span>}
    </div>
  );
}

function ResultCard({
  title,
  image,
  meta,
  icon,
  onAdd,
  onView,
}: {
  title: string;
  image: string | null;
  meta?: string;
  icon: "ingredient" | "grocery";
  onAdd: () => void;
  onView: () => void;
}) {
  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <div className="relative h-32 w-full bg-muted">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
            No image
          </div>
        )}
      </div>
      <CardContent className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="line-clamp-2 font-medium">{title}</p>
            {meta && <p className="text-xs text-muted-foreground">{meta}</p>}
          </div>
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full",
              icon === "ingredient" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200" : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
            )}
          >
            {icon === "ingredient" ? <ShoppingBag className="h-4 w-4" /> : <Package className="h-4 w-4" />}
          </div>
        </div>
        <div className="mt-auto flex items-center justify-between gap-2">
          <Button size="sm" variant="ghost" onClick={onView}>
            Details
          </Button>
          <Button size="sm" onClick={onAdd}>
            Add to kitchen
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
