"use client";

import { useMemo, useState } from "react";
import {
  Calendar,
  ChevronDown,
  Loader2,
  Minus,
  Package,
  Plus,
  Search,
  Utensils,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/supabase/utils";

type UnitOption = { id: string; name: string; abbreviation?: string | null; type: string };

type InventoryEntry = {
  id: string;
  itemId: string;
  itemName: string;
  imageUrl: string | null;
  aisle: string | null;
  quantity: number;
  unit: string | null;
  expiresAt: string | null;
};

type LocationBucket = {
  id: string;
  name: string;
  icon?: string | null;
  inventory: InventoryEntry[];
};

type IngredientResult = { id: number; name: string; image: string | null; aisle: string | null };

type Stack = {
  itemId: string;
  itemName: string;
  imageUrl: string | null;
  aisle: string | null;
  entries: InventoryEntry[];
};

export function InventoryClient({
  kitchenId,
  units,
  locations,
}: {
  kitchenId: string;
  units: UnitOption[];
  locations: LocationBucket[];
}) {
  const [buckets, setBuckets] = useState<LocationBucket[]>(locations);
  const [openLocations, setOpenLocations] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(locations.map((loc) => [loc.id, true])),
  );

  const [addOpen, setAddOpen] = useState(false);
  const [addStep, setAddStep] = useState<"search" | "details">("search");
  const [addQuery, setAddQuery] = useState("");
  const [addResults, setAddResults] = useState<IngredientResult[]>([]);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSelection, setAddSelection] = useState<IngredientResult | null>(null);
  const [addQuantity, setAddQuantity] = useState("1");
  const [addUnitId, setAddUnitId] = useState<string | null>(null);
  const [addExpiresAt, setAddExpiresAt] = useState("");
  const [addLocationId, setAddLocationId] = useState<string | null>(locations[0]?.id ?? null);
  const [addSaving, setAddSaving] = useState(false);
  const [addSuggestedUnits, setAddSuggestedUnits] = useState<string[]>([]);

  const [manageOpen, setManageOpen] = useState(false);
  const [manageStack, setManageStack] = useState<Stack | null>(null);
  const [manageEntryId, setManageEntryId] = useState<string | null>(null);
  const [manageTarget, setManageTarget] = useState<InventoryEntry | null>(null);
  const [manageQuantity, setManageQuantity] = useState("1");
  const [manageUnitId, setManageUnitId] = useState<string | null>(null);
  const [manageExpiresAt, setManageExpiresAt] = useState("");
  const [manageSaving, setManageSaving] = useState(false);
  const [manageError, setManageError] = useState<string | null>(null);

  const [consumeOpen, setConsumeOpen] = useState(false);
  const [consumeStack, setConsumeStack] = useState<Stack | null>(null);
  const [consumeEntryId, setConsumeEntryId] = useState<string | null>(null);
  const [consumeAmount, setConsumeAmount] = useState("");
  const [consumeSaving, setConsumeSaving] = useState(false);
  const [consumeError, setConsumeError] = useState<string | null>(null);
  const [consumeConfirm, setConsumeConfirm] = useState<string | null>(null);

  const displayUnits = useMemo(() => units.filter((unit) => unit.type !== "time"), [units]);

  const locationStacks = useMemo(() => {
    return buckets.map((location) => {
      const grouped = new Map<string, Stack>();
      for (const entry of location.inventory) {
        const key = `${entry.itemId}`;
        const existing = grouped.get(key);
        if (existing) {
          existing.entries.push(entry);
        } else {
          grouped.set(key, {
            itemId: entry.itemId,
            itemName: entry.itemName,
            imageUrl: entry.imageUrl,
            aisle: entry.aisle,
            entries: [entry],
          });
        }
      }

      const stacks = Array.from(grouped.values())
        .map((stack) => ({
          ...stack,
          entries: stack.entries.sort(sortByExpiry),
        }))
        .sort((a, b) => sortByExpiry(a.entries[0], b.entries[0]));

      return {
        ...location,
        stacks,
      };
    });
  }, [buckets]);

  function sortByExpiry(a: InventoryEntry, b: InventoryEntry) {
    if (!a.expiresAt && !b.expiresAt) return 0;
    if (!a.expiresAt) return 1;
    if (!b.expiresAt) return -1;
    return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
  }

  function formatExpiry(value: string | null) {
    if (!value) return "No expiration";
    return value;
  }

  function getPlaceholderIcon(aisle: string | null) {
    if (!aisle) return Package;
    const lower = aisle.toLowerCase();
    if (lower.includes("dairy") || lower.includes("egg")) return Utensils;
    if (lower.includes("meat") || lower.includes("seafood")) return Utensils;
    if (lower.includes("produce") || lower.includes("vegetable") || lower.includes("fruit")) return Utensils;
    return Package;
  }

  async function runAddSearch() {
    if (!addQuery.trim()) {
      setAddError("Enter an ingredient to search.");
      return;
    }
    setAddLoading(true);
    setAddError(null);
    try {
      const res = await fetch("/api/ingredients/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: addQuery.trim() }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        const message =
          typeof data.error === "string"
            ? data.error
            : typeof data.detail === "string"
              ? data.detail
              : "Search failed";
        setAddError(message);
        return;
      }
      const results = Array.isArray(data.results) ? (data.results as IngredientResult[]) : [];
      setAddResults(results);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Search failed";
      setAddError(message);
    } finally {
      setAddLoading(false);
    }
  }

  async function loadIngredientDetails(ingredient: IngredientResult) {
    try {
      const res = await fetch(`/api/ingredients/${ingredient.id}`);
      const data = await res.json();
      const units = Array.isArray(data.possibleUnits)
        ? (data.possibleUnits as unknown[]).filter((value): value is string => typeof value === "string")
        : [];
      setAddSuggestedUnits(units);
      if (units.length > 0) {
        const suggested = resolveSuggestedUnitId(units);
        setAddUnitId(suggested ?? null);
      }
    } catch {
      setAddSuggestedUnits([]);
    }
  }

  function resolveSuggestedUnitId(possible: string[]) {
    const lowered = possible.map((value) => value.toLowerCase());
    const match = displayUnits.find(
      (unit) =>
        (unit.name && lowered.includes(unit.name.toLowerCase())) ||
        (unit.abbreviation && lowered.includes(unit.abbreviation.toLowerCase())),
    );
    return match?.id ?? null;
  }

  function resetAddState() {
    setAddStep("search");
    setAddQuery("");
    setAddResults([]);
    setAddSelection(null);
    setAddQuantity("1");
    setAddUnitId(null);
    setAddExpiresAt("");
    setAddError(null);
    setAddSuggestedUnits([]);
  }

  async function handleAddItem() {
    if (!addSelection) return;
    const qty = Number(addQuantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      setAddError("Enter a valid quantity.");
      return;
    }
    if (!addLocationId) {
      setAddError("Select a location.");
      return;
    }

    setAddSaving(true);
    setAddError(null);
    try {
      const res = await fetch("/api/ingredients/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kitchenId,
          name: addSelection.name,
          quantity: qty,
          unitId: addUnitId || null,
          locationId: addLocationId,
          expiresAt: addExpiresAt || null,
          spoonacularId: addSelection.id,
          imageUrl: addSelection.image ?? undefined,
          aisle: addSelection.aisle ?? undefined,
          possibleUnits: addSuggestedUnits.length > 0 ? addSuggestedUnits : undefined,
        }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        const message =
          typeof data.error === "string"
            ? data.error
            : typeof data.detail === "string"
              ? data.detail
              : "Could not add item";
        setAddError(message);
        return;
      }

      const inventoryId =
        typeof data.inventoryId === "string" ? data.inventoryId : String(Date.now());
      setBuckets((current) =>
        current.map((loc) =>
          loc.id === addLocationId
            ? {
                ...loc,
                inventory: [
                  {
                    id: inventoryId,
                    itemId: String(data.itemId ?? addSelection.id),
                    itemName: addSelection.name,
                    imageUrl: addSelection.image ?? null,
                    aisle: addSelection.aisle ?? null,
                    quantity: qty,
                    unit:
                      displayUnits.find((unit) => unit.id === addUnitId)?.abbreviation ??
                      displayUnits.find((unit) => unit.id === addUnitId)?.name ??
                      null,
                    expiresAt: addExpiresAt || null,
                  },
                  ...loc.inventory,
                ],
              }
            : loc,
        ),
      );

      setAddOpen(false);
      resetAddState();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not add item";
      setAddError(message);
    } finally {
      setAddSaving(false);
    }
  }

  function openManage(stack: Stack) {
    const entry = stack.entries[0];
    setManageStack(stack);
    setManageEntryId(entry?.id ?? null);
    if (!entry) return;
    setManageTarget(entry);
    setManageQuantity(String(entry.quantity ?? 1));
    const unitId = displayUnits.find(
      (unit) => unit.abbreviation === entry.unit || unit.name === entry.unit,
    )?.id;
    setManageUnitId(unitId ?? null);
    setManageExpiresAt(entry.expiresAt ?? "");
    setManageError(null);
    setManageOpen(true);
  }

  function selectManageEntry(entryId: string | null) {
    if (!manageStack) return;
    const entry = manageStack.entries.find((item) => item.id === entryId);
    if (!entry) return;
    setManageEntryId(entry.id);
    setManageTarget(entry);
    setManageQuantity(String(entry.quantity ?? 1));
    const unitId = displayUnits.find(
      (unit) => unit.abbreviation === entry.unit || unit.name === entry.unit,
    )?.id;
    setManageUnitId(unitId ?? null);
    setManageExpiresAt(entry.expiresAt ?? "");
  }

  function adjustNumber(value: string, delta: number, min = 1) {
    const parsed = Number.parseInt(value, 10);
    const next = Number.isFinite(parsed) ? parsed + delta : min;
    const clamped = Math.max(min, Number.isFinite(next) ? next : min);
    return String(clamped);
  }

  async function handleManageSave() {
    if (!manageTarget) return;
    const qty = Number.parseInt(manageQuantity, 10);
    if (!Number.isFinite(qty) || qty <= 0) {
      setManageError("Enter a valid quantity.");
      return;
    }
    setManageSaving(true);
    setManageError(null);
    try {
      const res = await fetch(`/api/inventory/${manageTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity: qty,
          unitId: manageUnitId ?? null,
          expiresAt: manageExpiresAt || null,
        }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        const message =
          typeof data.error === "string"
            ? data.error
            : typeof data.detail === "string"
              ? data.detail
              : "Update failed";
        setManageError(message);
        return;
      }
      setBuckets((current) =>
        current.map((loc) => ({
          ...loc,
          inventory: loc.inventory.map((entry) =>
            entry.id === manageTarget.id
              ? {
                  ...entry,
                  quantity: qty,
                  unit:
                    displayUnits.find((unit) => unit.id === manageUnitId)?.abbreviation ??
                    displayUnits.find((unit) => unit.id === manageUnitId)?.name ??
                    null,
                  expiresAt: manageExpiresAt || null,
                }
              : entry,
          ),
        })),
      );
      setManageOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Update failed";
      setManageError(message);
    } finally {
      setManageSaving(false);
    }
  }

  function openConsume(stack: Stack) {
    setConsumeStack(stack);
    const first = stack.entries[0];
    setConsumeEntryId(first?.id ?? null);
    setConsumeAmount("");
    setConsumeError(null);
    setConsumeConfirm(null);
    setConsumeOpen(true);
  }

  async function handleConsume() {
    if (!consumeStack || !consumeEntryId) return;
    const qty = Number.parseInt(consumeAmount, 10);
    if (!Number.isFinite(qty) || qty <= 0) {
      setConsumeError("Enter a valid amount to consume.");
      return;
    }

    const entry = consumeStack.entries.find((e) => e.id === consumeEntryId);
    if (!entry) return;

    const remaining = entry.quantity - qty;
    const confirmMessage =
      remaining <= 0
        ? `This will consume all ${entry.quantity} ${entry.unit ?? ""} and remove the item.`
        : `This will use ${qty} ${entry.unit ?? ""} and leave ${remaining} ${entry.unit ?? ""}.`;
    if (!consumeConfirm) {
      setConsumeConfirm(confirmMessage);
      return;
    }

    setConsumeSaving(true);
    setConsumeError(null);
    try {
      const res = await fetch(`/api/inventory/${entry.id}/consume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: qty }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        const message =
          typeof data.error === "string"
            ? data.error
            : typeof data.detail === "string"
              ? data.detail
              : "Consume failed";
        setConsumeError(message);
        return;
      }

      const removed = data.removed === true;
      const newQuantity = typeof data.quantity === "number" ? data.quantity : remaining;

      setBuckets((current) =>
        current.map((loc) => ({
          ...loc,
          inventory: removed
            ? loc.inventory.filter((e) => e.id !== entry.id)
            : loc.inventory.map((e) => (e.id === entry.id ? { ...e, quantity: newQuantity } : e)),
        })),
      );

      setConsumeOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Consume failed";
      setConsumeError(message);
    } finally {
      setConsumeSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Inventory</p>
          <h1 className="text-2xl font-semibold tracking-tight">Manage your kitchen inventory</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Organize ingredients by location, track quantities, and stay ahead of expirations.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2 self-start sm:self-auto">
          <Plus className="h-4 w-4" />
          Add item
        </Button>
      </div>

      <div className="space-y-4">
        {locationStacks.map((location) => (
          <Card key={location.id}>
            <Collapsible
              open={openLocations[location.id] ?? true}
              onOpenChange={(open) =>
                setOpenLocations((current) => ({ ...current, [location.id]: open }))
              }
            >
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">{location.name}</CardTitle>
                  <CardDescription>
                    {location.stacks.length} item{location.stacks.length === 1 ? "" : "s"}
                  </CardDescription>
                </div>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1">
                    <span>{openLocations[location.id] ?? true ? "Hide" : "Show"}</span>
                    <ChevronDown className={cn("h-4 w-4 transition-transform", (openLocations[location.id] ?? true) && "rotate-180")} />
                  </Button>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="grid grid-cols-1 gap-4 justify-items-center sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                  {location.stacks.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No items here yet.</div>
                  ) : (
                    location.stacks.map((stack) => (
                      <StackCard
                        key={`${location.id}-${stack.itemId}`}
                        stack={stack}
                        onManage={() => openManage(stack)}
                        onConsume={() => openConsume(stack)}
                        getPlaceholderIcon={getPlaceholderIcon}
                        formatExpiry={formatExpiry}
                      />
                    ))
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>

      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) resetAddState();
        }}
      >
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {addStep === "search" && (
              <>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <Label htmlFor="add-query">Search ingredients</Label>
                    <Input
                      id="add-query"
                      placeholder="milk, pasta, basil..."
                      value={addQuery}
                      onChange={(event) => setAddQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          runAddSearch();
                        }
                      }}
                    />
                  </div>
                  <Button onClick={runAddSearch} disabled={addLoading} className="gap-2">
                    {addLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    Search
                  </Button>
                </div>
                {addError && <p className="text-sm text-destructive">{addError}</p>}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {addResults.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => {
                        setAddSelection(result);
                        void loadIngredientDetails(result);
                      }}
                      className={cn(
                        "group flex flex-col rounded-lg border p-3 text-left transition hover:border-primary",
                        addSelection?.id === result.id && "border-primary bg-muted/50",
                      )}
                    >
                      <div className="flex h-24 items-center justify-center rounded-md bg-muted">
                        {result.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={result.image}
                            alt={result.name}
                            className="h-24 w-full rounded-md object-cover"
                          />
                        ) : (
                          <div className="text-sm text-muted-foreground">No image</div>
                        )}
                      </div>
                      <div className="mt-3 space-y-1">
                        <p className="line-clamp-2 font-medium">{result.name}</p>
                        {result.aisle && <p className="text-xs text-muted-foreground">{result.aisle}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {addStep === "details" && addSelection && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-md bg-muted">
                    {addSelection.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={addSelection.image}
                        alt={addSelection.name}
                        className="h-14 w-full object-cover"
                      />
                    ) : (
                      <Package className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{addSelection.name}</p>
                    {addSelection.aisle && (
                      <p className="text-xs text-muted-foreground">{addSelection.aisle}</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="add-qty">Quantity</Label>
                    <Input
                      id="add-qty"
                      inputMode="decimal"
                      value={addQuantity}
                      onChange={(event) => setAddQuantity(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <Select
                      value={addUnitId ?? "none"}
                      onValueChange={(value) => setAddUnitId(value === "none" ? null : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Optional" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No unit</SelectItem>
                        {displayUnits.map((unit) => (
                          <SelectItem key={unit.id} value={unit.id}>
                            {unit.name}
                            {unit.abbreviation ? ` (${unit.abbreviation})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Select
                      value={addLocationId ?? "none"}
                      onValueChange={(value) => setAddLocationId(value === "none" ? null : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add-exp">Expiration date (optional)</Label>
                    <Input
                      id="add-exp"
                      type="date"
                      value={addExpiresAt}
                      onChange={(event) => setAddExpiresAt(event.target.value)}
                    />
                  </div>
                </div>
                {addError && <p className="text-sm text-destructive">{addError}</p>}
              </div>
            )}
          </div>
          <DialogFooter>
            {addStep === "details" ? (
              <Button
                variant="ghost"
                onClick={() => {
                  setAddStep("search");
                  setAddError(null);
                }}
                disabled={addSaving}
              >
                Back
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => setAddOpen(false)} disabled={addSaving}>
                Cancel
              </Button>
            )}
            {addStep === "search" ? (
              <Button
                onClick={() => {
                  if (!addSelection) {
                    setAddError("Select an ingredient to continue.");
                    return;
                  }
                  setAddStep("details");
                }}
                disabled={!addSelection || addSaving}
              >
                Continue
              </Button>
            ) : (
              <Button onClick={handleAddItem} disabled={!addSelection || addSaving} className="gap-2">
                {addSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Add to kitchen
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="items-end text-right">
            <DialogTitle>Manage ingredient</DialogTitle>
          </DialogHeader>
          {manageTarget && (
            <div className="space-y-4 text-right">
              <div className="text-sm text-muted-foreground">{manageTarget.itemName}</div>
              {manageStack && manageStack.entries.length > 1 && (
                <div className="space-y-2 max-w-sm ml-auto">
                  <Label className="text-right">Choose entry</Label>
                  <Select
                    value={manageEntryId ?? "none"}
                    onValueChange={(value) => selectManageEntry(value === "none" ? null : value)}
                  >
                    <SelectTrigger className="text-right">
                      <SelectValue placeholder="Select an entry" />
                    </SelectTrigger>
                    <SelectContent>
                      {manageStack.entries.map((entry) => (
                        <SelectItem key={entry.id} value={entry.id}>
                          {entry.quantity} {entry.unit ?? ""} · {formatExpiry(entry.expiresAt)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 max-w-sm ml-auto">
                <div className="space-y-2 max-w-[220px] ml-auto">
                  <Label htmlFor="manage-qty" className="text-right">Quantity</Label>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setManageQuantity((value) => adjustNumber(value, -1))}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      id="manage-qty"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={manageQuantity}
                      onChange={(event) => setManageQuantity(event.target.value)}
                      className="w-24 text-right"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setManageQuantity((value) => adjustNumber(value, 1))}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2 max-w-[220px] ml-auto">
                  <Label className="text-right">Unit</Label>
                  <Select
                    value={manageUnitId ?? "none"}
                    onValueChange={(value) => setManageUnitId(value === "none" ? null : value)}
                  >
                    <SelectTrigger className="text-right">
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No unit</SelectItem>
                      {displayUnits.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id}>
                          {unit.name}
                          {unit.abbreviation ? ` (${unit.abbreviation})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2 max-w-[240px] ml-auto">
                  <Label htmlFor="manage-exp" className="text-right">Expiration date</Label>
                  <Input
                    id="manage-exp"
                    type="date"
                    value={manageExpiresAt}
                    onChange={(event) => setManageExpiresAt(event.target.value)}
                    className="text-right"
                  />
                </div>
              </div>
              {manageError && <p className="text-sm text-destructive">{manageError}</p>}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setManageOpen(false)} disabled={manageSaving}>
              Cancel
            </Button>
            <Button onClick={handleManageSave} disabled={manageSaving} className="gap-2">
              {manageSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={consumeOpen} onOpenChange={setConsumeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="items-end text-right">
            <DialogTitle>Consume ingredient</DialogTitle>
          </DialogHeader>
          {consumeStack && (
            <div className="space-y-4 text-right">
              <div className="text-sm text-muted-foreground">{consumeStack.itemName}</div>
              {consumeStack.entries.length > 1 && (
                <div className="space-y-2 max-w-sm ml-auto">
                  <Label className="text-right">Choose entry</Label>
                  <Select
                    value={consumeEntryId ?? "none"}
                    onValueChange={(value) => {
                      setConsumeEntryId(value === "none" ? null : value);
                      setConsumeConfirm(null);
                    }}
                  >
                    <SelectTrigger className="text-right">
                      <SelectValue placeholder="Select an entry" />
                    </SelectTrigger>
                    <SelectContent>
                      {consumeStack.entries.map((entry) => (
                        <SelectItem key={entry.id} value={entry.id}>
                          {entry.quantity} {entry.unit ?? ""} · {formatExpiry(entry.expiresAt)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2 max-w-[220px] ml-auto">
                <Label htmlFor="consume-amount" className="text-right">Amount to consume</Label>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setConsumeAmount((value) => adjustNumber(value, -1));
                      setConsumeConfirm(null);
                    }}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    id="consume-amount"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={consumeAmount}
                    onChange={(event) => {
                      setConsumeAmount(event.target.value);
                      setConsumeConfirm(null);
                    }}
                    className="w-24 text-right"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setConsumeAmount((value) => adjustNumber(value, 1));
                      setConsumeConfirm(null);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {consumeConfirm && <p className="text-xs text-muted-foreground">{consumeConfirm}</p>}
              {consumeError && <p className="text-sm text-destructive">{consumeError}</p>}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConsumeOpen(false)} disabled={consumeSaving}>
              Cancel
            </Button>
            <Button onClick={handleConsume} disabled={consumeSaving} className="gap-2">
              {consumeSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {consumeConfirm ? "Confirm consumption" : "Continue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StackCard({
  stack,
  onManage,
  onConsume,
  getPlaceholderIcon,
  formatExpiry,
}: {
  stack: Stack;
  onManage: () => void;
  onConsume: () => void;
  getPlaceholderIcon: (aisle: string | null) => typeof Package;
  formatExpiry: (value: string | null) => string;
}) {
  const top = stack.entries[0];
  const PlaceholderIcon = getPlaceholderIcon(stack.aisle);
  const count = stack.entries.length;

  return (
    <div className="relative">
      {count > 1 && (
        <>
          <div className="absolute -left-2 -top-2 h-full w-full rounded-xl border bg-background/60 shadow-sm" />
          {count > 2 && (
            <div className="absolute -left-1 -top-1 h-full w-full rounded-xl border bg-background/70 shadow-sm" />
          )}
        </>
      )}
      <Card className="relative w-full max-w-[240px] overflow-hidden">
        <div className="relative h-40 w-full bg-muted">
          {stack.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={stack.imageUrl} alt={stack.itemName} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <PlaceholderIcon className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          {count > 1 && (
            <span className="absolute right-2 top-2 rounded-full border bg-background/90 px-2 py-1 text-xs text-muted-foreground shadow-sm">
              {count}
            </span>
          )}
        </div>
        <CardContent className="flex h-full flex-col gap-2 p-4">
          <div className="space-y-1">
            <p className="line-clamp-2 text-sm font-semibold">{stack.itemName}</p>
            <p className="text-xs text-muted-foreground">
              {top.quantity}
              {top.unit ? ` ${top.unit}` : ""} · {formatExpiry(top.expiresAt)}
            </p>
          </div>
          <div className="mt-auto flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onManage} className="gap-1">
              <Calendar className="h-4 w-4" />
              Manage
            </Button>
            <Button size="sm" onClick={onConsume} className="gap-1">
              <Utensils className="h-4 w-4" />
              Consume
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
