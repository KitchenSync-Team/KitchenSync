"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { addDays, addMonths, format, isValid, parseISO } from "date-fns";
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  Search,
  Utensils,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InventoryIngredientCard } from "@/components/inventory/inventory-ingredient-card";
import { formatInventoryExpiry, formatInventoryItemName, formatQuantityWithUnit, formatUnitLabel } from "@/lib/formatting/inventory";
import { getIngredientFallbackIcon } from "@/lib/ingredients/icon";
import { cn } from "@/lib/supabase/utils";
import { filterImperialUnits, filterUnitsByPossible } from "@/lib/units/filters";

type UnitOption = { id: string; name: string; abbreviation?: string | null; type: string };

type InventoryEntry = {
  id: string;
  itemId: string;
  itemName: string;
  imageUrl: string | null;
  aisle: string | null;
  quantity: number;
  unit: string | null;
  unitId?: string | null;
  expiresAt: string | null;
  possibleUnits?: string[] | null;
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
  const [addLoadingMore, setAddLoadingMore] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSelection, setAddSelection] = useState<IngredientResult | null>(null);
  const [addTotalResults, setAddTotalResults] = useState(0);
  const [addQuantity, setAddQuantity] = useState("1");
  const [addUnitId, setAddUnitId] = useState<string | null>(null);
  const [addExpiresAt, setAddExpiresAt] = useState("");
  const [addExpiresAtInput, setAddExpiresAtInput] = useState("");
  const [addCalendarOpen, setAddCalendarOpen] = useState(false);
  const [addCalendarMonth, setAddCalendarMonth] = useState<Date | undefined>(undefined);
  const [addCalendarDirection, setAddCalendarDirection] = useState<"next" | "prev">("next");
  const [addCalendarAnimKey, setAddCalendarAnimKey] = useState(0);
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
  const [manageExpiresAtInput, setManageExpiresAtInput] = useState("");
  const [manageSaving, setManageSaving] = useState(false);
  const [manageCalendarOpen, setManageCalendarOpen] = useState(false);
  const [manageCalendarMonth, setManageCalendarMonth] = useState<Date | undefined>(undefined);
  const [manageCalendarDirection, setManageCalendarDirection] = useState<"next" | "prev">("next");
  const [manageCalendarAnimKey, setManageCalendarAnimKey] = useState(0);
  const [manageError, setManageError] = useState<string | null>(null);

  const [consumeOpen, setConsumeOpen] = useState(false);
  const [consumeStack, setConsumeStack] = useState<Stack | null>(null);
  const [consumeEntryId, setConsumeEntryId] = useState<string | null>(null);
  const [consumeAmount, setConsumeAmount] = useState("");
  const [consumeSaving, setConsumeSaving] = useState(false);
  const [consumeError, setConsumeError] = useState<string | null>(null);
  const [consumeConfirm, setConsumeConfirm] = useState<string | null>(null);

  const allLocationIds = useMemo(() => buckets.map((loc) => loc.id), [buckets]);
  const allExpanded = useMemo(
    () => allLocationIds.every((id) => openLocations[id] ?? true),
    [allLocationIds, openLocations],
  );
  const allCollapsed = useMemo(
    () => allLocationIds.every((id) => !(openLocations[id] ?? true)),
    [allLocationIds, openLocations],
  );

  const setAllLocationsOpen = useCallback(
    (open: boolean) => {
      setOpenLocations(Object.fromEntries(allLocationIds.map((id) => [id, open])));
    },
    [allLocationIds],
  );

  const displayUnits = useMemo(() => filterImperialUnits(units), [units]);

  const resolveUnitIdByLabel = useCallback(
    (label: string | null) => {
      if (!label) return null;
      const normalized = label.trim().toLowerCase().replace(/^\d+(\.\d+)?\s*/, "");
      if (!normalized) return null;
      const match = displayUnits.find((unit) => {
        const name = unit.name.toLowerCase();
        const abbr = unit.abbreviation?.toLowerCase();
        const plural = formatUnitLabel(2, unit.name)?.toLowerCase();
        return normalized === name || normalized === abbr || (plural && normalized === plural);
      });
      return match?.id ?? null;
    },
    [displayUnits],
  );
  const addUnitOptions = useMemo(
    () => filterUnitsByPossible(displayUnits, addSuggestedUnits),
    [displayUnits, addSuggestedUnits],
  );
  const resolvedManageUnitId = useMemo(
    () => manageUnitId ?? resolveUnitIdByLabel(manageTarget?.unit ?? null),
    [manageTarget?.unit, manageUnitId, resolveUnitIdByLabel],
  );

  const manageUnitOptions = useMemo(() => {
    const options = filterUnitsByPossible(displayUnits, manageTarget?.possibleUnits ?? null);
    if (!resolvedManageUnitId) return options;
    if (options.some((unit) => unit.id === resolvedManageUnitId)) return options;
    const fallback = displayUnits.find((unit) => unit.id === resolvedManageUnitId);
    return fallback ? [fallback, ...options] : options;
  }, [displayUnits, manageTarget?.possibleUnits, resolvedManageUnitId]);
  const addQuantityValue = Number(addQuantity);
  const addUnitQuantity = Number.isFinite(addQuantityValue) && addQuantityValue > 0 ? addQuantityValue : 1;
  const manageQuantityValue = Number.parseInt(manageQuantity, 10);
  const manageUnitQuantity = Number.isFinite(manageQuantityValue) && manageQuantityValue > 0 ? manageQuantityValue : 1;
  const consumeQuantityValue = Number.parseInt(consumeAmount, 10);
  const consumeUnitQuantity = Number.isFinite(consumeQuantityValue) && consumeQuantityValue > 0 ? consumeQuantityValue : 1;
  const manageSelectedDate = useMemo(() => {
    if (!manageExpiresAt) return undefined;
    const parsed = parseISO(manageExpiresAt);
    return isValid(parsed) ? parsed : undefined;
  }, [manageExpiresAt]);
  const consumeSelectedEntry = useMemo(() => {
    if (!consumeStack) return null;
    return consumeStack.entries.find((item) => item.id === consumeEntryId) ?? consumeStack.entries[0] ?? null;
  }, [consumeEntryId, consumeStack]);

  useEffect(() => {
    if (manageSelectedDate) {
      setManageCalendarMonth(new Date(manageSelectedDate.getFullYear(), manageSelectedDate.getMonth(), 1));
    }
  }, [manageSelectedDate]);
  useEffect(() => {
    if (!addExpiresAt) {
      setAddCalendarMonth(undefined);
      setAddExpiresAtInput("");
      return;
    }
    const parsed = parseISO(addExpiresAt);
    if (!isValid(parsed)) return;
    const monthStart = new Date(parsed.getFullYear(), parsed.getMonth(), 1);
    setAddCalendarMonth((current) =>
      current && current.getTime() === monthStart.getTime() ? current : monthStart,
    );
    setAddExpiresAtInput(format(parsed, "MM/dd/yyyy"));
  }, [addExpiresAt]);
  useEffect(() => {
    if (!consumeSelectedEntry) return;
    const parsed = Number.parseInt(consumeAmount, 10);
    if (!Number.isFinite(parsed)) return;
    if (parsed > consumeSelectedEntry.quantity) {
      setConsumeAmount(String(consumeSelectedEntry.quantity));
      setConsumeConfirm(null);
      setConsumeError(null);
    }
  }, [consumeAmount, consumeSelectedEntry]);

  useEffect(() => {
    if (!manageTarget) return;
    if (manageUnitId) return;
    const resolved = resolveUnitIdByLabel(manageTarget.unit ?? null);
    if (!resolved) return;
    setManageUnitId(resolved);
  }, [manageTarget, manageUnitId, resolveUnitIdByLabel]);

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
    return formatInventoryExpiry(value);
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
        body: JSON.stringify({ query: addQuery.trim(), number: 12, offset: 0 }),
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
      setAddTotalResults(typeof data.totalResults === "number" ? data.totalResults : results.length);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Search failed";
      setAddError(message);
    } finally {
      setAddLoading(false);
    }
  }

  async function loadMoreResults() {
    if (addLoadingMore || addLoading) return;
    if (!addQuery.trim()) return;
    if (addResults.length >= addTotalResults) return;
    setAddLoadingMore(true);
    try {
      const res = await fetch("/api/ingredients/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: addQuery.trim(),
          number: 12,
          offset: addResults.length,
        }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) return;
      const results = Array.isArray(data.results) ? (data.results as IngredientResult[]) : [];
      if (results.length === 0) return;
      setAddResults((current) => {
        const seen = new Set(current.map((item) => item.id));
        const next = results.filter((item) => !seen.has(item.id));
        return [...current, ...next];
      });
      if (typeof data.totalResults === "number") {
        setAddTotalResults(data.totalResults);
      }
    } finally {
      setAddLoadingMore(false);
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
    const allowedUnits = filterUnitsByPossible(displayUnits, possible);
    const match = allowedUnits.find(
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
    setAddTotalResults(0);
    setAddSelection(null);
    setAddQuantity("1");
    setAddUnitId(null);
    setAddExpiresAt("");
    setAddExpiresAtInput("");
    setAddCalendarOpen(false);
    setAddCalendarMonth(undefined);
    setAddCalendarDirection("next");
    setAddCalendarAnimKey(0);
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
          name: formatInventoryItemName(addSelection.name),
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
              : "Could not add item.";
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
                    itemName: formatInventoryItemName(addSelection.name),
                    imageUrl: addSelection.image ?? null,
                    aisle: addSelection.aisle ?? null,
                    quantity: qty,
                    unitId: addUnitId ?? null,
                    unit:
                      displayUnits.find((unit) => unit.id === addUnitId)?.abbreviation ??
                      displayUnits.find((unit) => unit.id === addUnitId)?.name ??
                      null,
                    expiresAt: addExpiresAt || null,
                    possibleUnits: addSuggestedUnits.length > 0 ? addSuggestedUnits : null,
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
      const message = err instanceof Error ? err.message : "Could not add item.";
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
    setManageUnitId(entry.unitId ?? resolveUnitIdByLabel(entry.unit));
    setManageExpiresAt(entry.expiresAt ?? "");
    const initialExpiry = entry.expiresAt ? parseISO(entry.expiresAt) : null;
    setManageExpiresAtInput(initialExpiry && isValid(initialExpiry) ? format(initialExpiry, "MM/dd/yyyy") : "");
    setManageError(null);
    setManageCalendarOpen(false);
    setManageOpen(true);
  }

  function selectManageEntry(entryId: string | null) {
    if (!manageStack) return;
    const entry = manageStack.entries.find((item) => item.id === entryId);
    if (!entry) return;
    setManageEntryId(entry.id);
    setManageTarget(entry);
    setManageQuantity(String(entry.quantity ?? 1));
    setManageUnitId(entry.unitId ?? resolveUnitIdByLabel(entry.unit));
    setManageExpiresAt(entry.expiresAt ?? "");
    const initialExpiry = entry.expiresAt ? parseISO(entry.expiresAt) : null;
    setManageExpiresAtInput(initialExpiry && isValid(initialExpiry) ? format(initialExpiry, "MM/dd/yyyy") : "");
    setManageCalendarOpen(false);
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
    if (!Number.isFinite(qty) || qty <= 0 || qty > 999) {
      setManageError("Enter a valid quantity (max 999).");
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
                  unitId: manageUnitId ?? entry.unitId ?? null,
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
    if (qty > entry.quantity) {
      setConsumeError(`You only have ${formatQuantityWithUnit(entry.quantity, entry.unit)} available.`);
      return;
    }

    const remaining = entry.quantity - qty;
    const confirmMessage =
      remaining <= 0
        ? `This will consume all ${formatQuantityWithUnit(entry.quantity, entry.unit)} and remove the item.`
        : `This will use ${formatQuantityWithUnit(qty, entry.unit)} and leave ${formatQuantityWithUnit(remaining, entry.unit)}.`;
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
      {/* Add item modal */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Inventory</p>
          <h1 className="text-2xl font-semibold tracking-tight">Manage your kitchen inventory</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Organize ingredients by location, track quantities, and stay ahead of expirations.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAllLocationsOpen(true)}
            disabled={allExpanded}
            className="gap-1"
          >
            <ChevronDown className="h-4 w-4 rotate-180" />
            Expand all
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAllLocationsOpen(false)}
            disabled={allCollapsed}
            className="gap-1"
          >
            <ChevronDown className="h-4 w-4" />
            Collapse all
          </Button>
          <Button onClick={() => setAddOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add item
          </Button>
        </div>
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
        <DialogContent
          className={cn(
            "flex flex-col",
            addStep === "details"
              ? "sm:max-w-sm"
              : addResults.length === 0 && !addLoading
                ? "sm:max-w-md"
                : "sm:max-w-3xl max-h-[85vh]",
          )}
        >
          <DialogHeader>
            <DialogTitle>
              {addStep === "details" && addSelection
                ? `Add ${formatInventoryItemName(addSelection.name)}`
                : "Add item"}
            </DialogTitle>
          </DialogHeader>
        <div className="flex-1 space-y-4">
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

                <div
                  className="app-scrollbar max-h-[50vh] overflow-y-auto pr-1 sm:max-h-[55vh]"
                  onScroll={(event) => {
                    const target = event.currentTarget;
                    const nearBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 120;
                    if (nearBottom) void loadMoreResults();
                  }}
                >
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                    {addResults.map((result) => {
                      const PlaceholderIcon = getIngredientFallbackIcon({
                        name: result.name,
                        aisle: result.aisle,
                      });
                      const hasImage = Boolean(result.image && !result.image.endsWith("/no.jpg"));
                      return (
                        <button
                          key={result.id}
                          type="button"
                          onClick={() => {
                            setAddSelection(result);
                            void loadIngredientDetails(result);
                          }}
                          className={cn(
                            "group flex flex-col rounded-lg border p-2 text-left transition hover:border-primary",
                            addSelection?.id === result.id && "border-primary bg-muted/50",
                          )}
                        >
                          <div className="flex h-28 items-center justify-center rounded-md bg-muted">
                            {hasImage ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={result.image ?? ""}
                                alt={formatInventoryItemName(result.name)}
                                className="h-28 w-full rounded-md object-contain p-2"
                              />
                            ) : (
                              <PlaceholderIcon className="h-6 w-6 text-muted-foreground" />
                            )}
                          </div>
                          <div className="mt-3 space-y-1">
                            <p className="line-clamp-2 font-medium">{formatInventoryItemName(result.name)}</p>
                            {result.aisle && <p className="text-xs text-muted-foreground">{result.aisle}</p>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                {addLoadingMore && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading more...
                  </div>
                )}
                {!addLoadingMore && addResults.length > 0 && addResults.length >= addTotalResults && (
                  <p className="text-center text-xs text-muted-foreground">End of results</p>
                )}
              </>
            )}

            {addStep === "details" && addSelection && (
              <div className="mx-auto w-full max-w-md space-y-4">
                <div className="space-y-3">
                  <QuantityUnitRow
                    label="Quantity"
                    inputId="add-qty"
                    value={addQuantity}
                    onChange={setAddQuantity}
                    onAdjust={adjustNumber}
                    unitId={addUnitId}
                    onUnitChange={setAddUnitId}
                    units={addUnitOptions}
                    quantityForLabel={addUnitQuantity}
                  />

                  <div className="space-y-1">
                    <Label>Location</Label>
                    <Select
                      value={addLocationId ?? "none"}
                      onValueChange={(value) => setAddLocationId(value === "none" ? null : value)}
                    >
                      <SelectTrigger className="h-8 px-2">
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

                  <ExpirationPicker
                    label="Expiration date"
                    inputId="add-exp"
                    value={addExpiresAt}
                    inputValue={addExpiresAtInput}
                    onValueChange={setAddExpiresAt}
                    onInputValueChange={setAddExpiresAtInput}
                    calendarOpen={addCalendarOpen}
                    onCalendarOpenChange={setAddCalendarOpen}
                    calendarMonth={addCalendarMonth}
                    onCalendarMonthChange={setAddCalendarMonth}
                    calendarDirection={addCalendarDirection}
                    onCalendarDirectionChange={setAddCalendarDirection}
                    calendarAnimKey={addCalendarAnimKey}
                    onCalendarAnimKeyChange={setAddCalendarAnimKey}
                  />
                </div>

                {addError && <p className="text-sm text-destructive">{addError}</p>}
              </div>
            )}
          </div>
          {(addStep === "details" || (addStep === "search" && addSelection)) && (
          <DialogFooter className="mt-auto -mt-2 bg-background pt-2 pb-1">
            {addStep === "details" ? (
              <>
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
                <Button onClick={handleAddItem} disabled={!addSelection || addSaving} className="gap-2">
                  {addSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Add item
                </Button>
              </>
            ) : (
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
            )}
          </DialogFooter>
        )}
        </DialogContent>
      </Dialog>

      {/* Manage modal */}
      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Manage {manageTarget?.itemName ?? "ingredient"}</DialogTitle>
            <DialogDescription>Update quantities, units, and expiration details for this ingredient.</DialogDescription>
          </DialogHeader>
          {manageTarget && (
            <div className="space-y-4">
              {manageStack && manageStack.entries.length > 1 && (
                <div className="space-y-1">
                  <Label>Choose entry</Label>
                  <Select
                    value={manageEntryId ?? "none"}
                    onValueChange={(value) => selectManageEntry(value === "none" ? null : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an entry" />
                    </SelectTrigger>
                    <SelectContent>
                      {manageStack.entries.map((entry) => (
                        <SelectItem key={entry.id} value={entry.id}>
                          {formatQuantityWithUnit(entry.quantity, entry.unit)} - {formatExpiry(entry.expiresAt)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-3">
                <QuantityUnitRow
                  label="Quantity"
                  inputId="manage-qty"
                  value={manageQuantity}
                  onChange={setManageQuantity}
                  onAdjust={adjustNumber}
                  unitId={resolvedManageUnitId}
                  onUnitChange={setManageUnitId}
                  units={manageUnitOptions}
                  quantityForLabel={manageUnitQuantity}
                />
                <ExpirationPicker
                  label="Expiration date"
                  inputId="manage-exp"
                  value={manageExpiresAt}
                  inputValue={manageExpiresAtInput}
                  onValueChange={setManageExpiresAt}
                  onInputValueChange={setManageExpiresAtInput}
                  calendarOpen={manageCalendarOpen}
                  onCalendarOpenChange={setManageCalendarOpen}
                  calendarMonth={manageCalendarMonth}
                  onCalendarMonthChange={setManageCalendarMonth}
                  calendarDirection={manageCalendarDirection}
                  onCalendarDirectionChange={setManageCalendarDirection}
                  calendarAnimKey={manageCalendarAnimKey}
                  onCalendarAnimKeyChange={setManageCalendarAnimKey}
                />
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

      {/* Consume modal */}
      <Dialog open={consumeOpen} onOpenChange={setConsumeOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Consume {consumeStack?.itemName ?? "ingredient"}</DialogTitle>
            <DialogDescription>Remove an amount from a specific ingredient in your inventory.</DialogDescription>
          </DialogHeader>
          {consumeStack && (
            <div className="space-y-4">
              {consumeStack.entries.length > 1 && (
                <div className="space-y-1">
                  <Label>Choose entry</Label>
                  <Select
                    value={consumeEntryId ?? "none"}
                    onValueChange={(value) => {
                      setConsumeEntryId(value === "none" ? null : value);
                      setConsumeConfirm(null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an entry" />
                    </SelectTrigger>
                    <SelectContent>
                      {consumeStack.entries.map((entry) => (
                        <SelectItem key={entry.id} value={entry.id}>
                          {formatQuantityWithUnit(entry.quantity, entry.unit)} - {formatExpiry(entry.expiresAt)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="consume-amount">Quantity</Label>
                  <div className="flex items-center gap-2">
                    <div className="relative w-20">
                      <Input
                        id="consume-amount"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={consumeAmount}
                        onChange={(event) => {
                          const raw = event.target.value;
                          const maxQty = consumeSelectedEntry?.quantity ?? null;
                          const hasMax = typeof maxQty === "number";
                          if (!raw) {
                            setConsumeAmount(raw);
                            setConsumeConfirm(null);
                            setConsumeError(null);
                            return;
                          }
                          const parsed = Number.parseInt(raw, 10);
                          if (!Number.isFinite(parsed)) {
                            setConsumeAmount(raw);
                            setConsumeConfirm(null);
                            setConsumeError(null);
                            return;
                          }
                          const next = hasMax ? Math.min(parsed, maxQty) : parsed;
                          setConsumeAmount(String(next));
                          setConsumeConfirm(null);
                          setConsumeError(null);
                        }}
                        className="h-8 w-20 pr-8 px-2"
                      />
                      <div className="absolute right-1 top-1/2 flex -translate-y-1/2 flex-col">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="h-5 w-5"
                          aria-label="Increase quantity"
                        onClick={() => {
                          const maxQty = consumeSelectedEntry?.quantity ?? null;
                          setConsumeAmount((value) => {
                            const next = adjustNumber(value, 1);
                            if (typeof maxQty !== "number") return next;
                            const parsed = Number.parseInt(next, 10);
                            return String(Math.min(parsed, maxQty));
                          });
                          setConsumeConfirm(null);
                          setConsumeError(null);
                        }}
                      >
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="h-5 w-5"
                          aria-label="Decrease quantity"
                        onClick={() => {
                          setConsumeAmount((value) => adjustNumber(value, -1));
                          setConsumeConfirm(null);
                          setConsumeError(null);
                        }}
                      >
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    {(() => {
                      const unitLabel = consumeSelectedEntry?.unit ?? "No unit";
                      const unitDisplay =
                        unitLabel === "No unit" ? unitLabel : formatUnitLabel(consumeUnitQuantity, unitLabel) || unitLabel;
                      return (
                        <Select value={unitLabel} disabled>
                          <SelectTrigger className="h-8 px-2">
                            <SelectValue placeholder="Unit" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={unitLabel}>{unitDisplay}</SelectItem>
                          </SelectContent>
                        </Select>
                      );
                    })()}
                  </div>
                  {consumeSelectedEntry && (
                    <p className="text-xs text-muted-foreground">
                      On hand: {formatQuantityWithUnit(consumeSelectedEntry.quantity, consumeSelectedEntry.unit)}
                    </p>
                  )}
                </div>
              </div>
              {consumeConfirm && (
                <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
                  {consumeConfirm}
                </div>
              )}
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

function QuantityUnitRow({
  label,
  inputId,
  value,
  onChange,
  onAdjust,
  unitId,
  onUnitChange,
  units,
  quantityForLabel,
}: {
  label: string;
  inputId: string;
  value: string;
  onChange: (value: string) => void;
  onAdjust: (value: string, delta: number, min?: number) => string;
  unitId: string | null;
  onUnitChange: (value: string | null) => void;
  units: UnitOption[];
  quantityForLabel: number;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={inputId}>{label}</Label>
      <div className="flex items-center gap-2">
        <div className="relative w-20">
          <Input
            id={inputId}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={3}
            value={value}
            onChange={(event) => {
              const raw = event.target.value;
              if (!raw) {
                onChange(raw);
                return;
              }
              const parsed = Number.parseInt(raw, 10);
              if (!Number.isFinite(parsed)) {
                onChange(raw);
                return;
              }
              onChange(String(Math.min(parsed, 999)));
            }}
            className="h-8 w-20 pr-8 px-2"
          />
          <div className="absolute right-1 top-1/2 flex -translate-y-1/2 flex-col">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="h-5 w-5"
              aria-label="Increase quantity"
              onClick={() => {
                const next = onAdjust(value, 1);
                const parsed = Number.parseInt(next, 10);
                onChange(String(Math.min(parsed, 999)));
              }}
            >
              <ChevronUp className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="h-5 w-5"
              aria-label="Decrease quantity"
              onClick={() => onChange(onAdjust(value, -1))}
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <Select value={unitId ?? "none"} onValueChange={(val) => onUnitChange(val === "none" ? null : val)}>
          <SelectTrigger className="h-8 px-2">
            <SelectValue placeholder="Optional" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No unit</SelectItem>
            {units.map((unit) => {
              const labelValue = formatUnitLabel(quantityForLabel, unit.name);
              return (
                <SelectItem key={unit.id} value={unit.id}>
                  {labelValue || unit.name}
                  {unit.abbreviation ? ` (${unit.abbreviation})` : ""}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function ExpirationPicker({
  label,
  inputId,
  value,
  inputValue,
  onValueChange,
  onInputValueChange,
  calendarOpen,
  onCalendarOpenChange,
  calendarMonth,
  onCalendarMonthChange,
  calendarDirection,
  onCalendarDirectionChange,
  calendarAnimKey,
  onCalendarAnimKeyChange,
}: {
  label: string;
  inputId: string;
  value: string;
  inputValue: string;
  onValueChange: (value: string) => void;
  onInputValueChange: (value: string) => void;
  calendarOpen: boolean;
  onCalendarOpenChange: (value: boolean) => void;
  calendarMonth: Date | undefined;
  onCalendarMonthChange: (value: Date | undefined) => void;
  calendarDirection: "next" | "prev";
  onCalendarDirectionChange: (value: "next" | "prev") => void;
  calendarAnimKey: number;
  onCalendarAnimKeyChange: (value: number) => void;
}) {
  const selectedDate = useMemo(() => {
    if (!value) return undefined;
    const parsed = parseISO(value);
    return isValid(parsed) ? parsed : undefined;
  }, [value]);
  const displayValue = useMemo(() => {
    if (inputValue) return inputValue;
    if (!selectedDate) return "";
    return format(selectedDate, "MM/dd/yyyy");
  }, [inputValue, selectedDate]);

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>{label}</Label>
        <div className="flex items-center gap-2">
        <div className="relative w-[7.25rem]">
          <Input
            id={inputId}
            type="text"
            placeholder="Select date"
            value={displayValue}
            readOnly
            onClick={() => onCalendarOpenChange(true)}
            className="h-8 w-full pr-7"
          />
          <Popover open={calendarOpen} onOpenChange={onCalendarOpenChange}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                aria-label="Pick expiration date"
              >
                <CalendarIcon className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              side="bottom"
              avoidCollisions={false}
              align="end"
              sideOffset={-305}
              alignOffset={-150}
              className="w-auto border-0 p-0 shadow-none origin-top-right data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-1"
            >
              <Card className="max-w-[260px] py-3">
                <CardContent className="px-3">
                  <div
                    key={calendarAnimKey}
                    className={cn(
                      "animate-in fade-in-0 duration-200",
                      calendarDirection === "next" ? "slide-in-from-right-3" : "slide-in-from-left-3",
                    )}
                  >
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      month={calendarMonth}
                      onMonthChange={(nextMonth) => {
                        if (calendarMonth && nextMonth) {
                          onCalendarDirectionChange(nextMonth > calendarMonth ? "next" : "prev");
                        }
                        onCalendarMonthChange(nextMonth);
                        onCalendarAnimKeyChange(calendarAnimKey + 1);
                      }}
                      onSelect={(date) => {
                        if (!date) {
                          onValueChange("");
                          onInputValueChange("");
                          return;
                        }
                        onValueChange(format(date, "yyyy-MM-dd"));
                        onInputValueChange(format(date, "MM/dd/yyyy"));
                        onCalendarMonthChange(new Date(date.getFullYear(), date.getMonth(), 1));
                      }}
                      fixedWeeks
                      className="bg-transparent p-0 [--cell-size:--spacing(8)]"
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-2 border-t px-3 pt-2 pb-2">
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: "+3d", kind: "days", value: 3 },
                      { label: "+1w", kind: "days", value: 7 },
                      { label: "+2w", kind: "days", value: 14 },
                      { label: "+1m", kind: "months", value: 1 },
                    ].map((preset) => (
                      <Button
                        key={preset.label}
                        variant="outline"
                        size="sm"
                        className="flex-1 px-2 text-xs"
                        onClick={() => {
                          const now = new Date();
                          const newDate =
                            preset.kind === "months"
                              ? addMonths(now, preset.value)
                              : addDays(now, preset.value);
                          onValueChange(format(newDate, "yyyy-MM-dd"));
                          onInputValueChange(format(newDate, "MM/dd/yyyy"));
                          const nextMonth = new Date(newDate.getFullYear(), newDate.getMonth(), 1);
                          if (calendarMonth) {
                            onCalendarDirectionChange(nextMonth > calendarMonth ? "next" : "prev");
                          }
                          onCalendarMonthChange(nextMonth);
                          onCalendarAnimKeyChange(calendarAnimKey + 1);
                        }}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                  <Button size="sm" className="w-full" onClick={() => onCalendarOpenChange(false)}>
                    Save
                  </Button>
                </CardFooter>
              </Card>
            </PopoverContent>
          </Popover>
        </div>
        {displayValue && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-red-600 hover:text-red-600"
            onClick={() => {
              onValueChange("");
              onInputValueChange("");
            }}
          >
            Clear
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">Leave blank for no expiration.</p>
    </div>
  );
}

function StackCard({
  stack,
  onManage,
  onConsume,
}: {
  stack: Stack;
  onManage: () => void;
  onConsume: () => void;
}) {
  const top = stack.entries[0];
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
      <InventoryIngredientCard
        name={stack.itemName}
        imageUrl={stack.imageUrl}
        aisle={stack.aisle}
        quantity={top.quantity}
        unit={top.unit}
        expiresAt={top.expiresAt}
        imageClassName="h-40 p-2"
        imageObjectClassName="object-contain"
        badgeContent={
          count > 1 ? (
            <span className="absolute right-2 top-2 rounded-full border bg-background/90 px-2 py-1 text-xs text-muted-foreground shadow-sm">
              {count}
            </span>
          ) : undefined
        }
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={onManage} className="gap-1">
              <CalendarIcon className="h-4 w-4" />
              Manage
            </Button>
            <Button size="sm" onClick={onConsume} className="gap-1">
              <Utensils className="h-4 w-4" />
              Consume
            </Button>
          </>
        }
      />
    </div>
  );
}
