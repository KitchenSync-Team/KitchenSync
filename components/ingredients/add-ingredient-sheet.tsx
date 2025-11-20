import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type LocationOption = { id: string; name: string; icon?: string | null };
type UnitOption = { id: string; name: string; abbreviation?: string | null; type: string };

export function AddIngredientSheet({
  open,
  onOpenChange,
  selection,
  kitchenId,
  locations,
  units,
  suggestedUnits,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selection: {
    name: string;
    brand?: string;
    id?: number;
    source?: string;
    catalogType?: "ingredient" | "grocery";
    imageUrl?: string;
    aisle?: string;
    possibleUnits?: string[];
  } | null;
  kitchenId: string;
  locations: LocationOption[];
  units: UnitOption[];
  suggestedUnits?: string[];
  onSuccess: (entry: { name: string; quantity: number; locationId?: string | null; unitLabel?: string | null }) => void;
}) {
  const [quantity, setQuantity] = useState("1");
  const [locationId, setLocationId] = useState<string | null>(locations[0]?.id ?? null);
  const [unitId, setUnitId] = useState<string | null>(null);
  const [brand, setBrand] = useState(selection?.brand ?? "");
  const [notes, setNotes] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = selection?.name ?? "Add ingredient";
  const displayUnits = useMemo(() => units.filter((unit) => unit.type !== "time"), [units]);
  const suggestedUnitIds = useMemo(() => {
    if (!suggestedUnits || suggestedUnits.length === 0) return [];
    const lowered = suggestedUnits.map((value) => value.toLowerCase());
    return displayUnits
      .filter(
        (unit) =>
          (unit.name && lowered.includes(unit.name.toLowerCase())) ||
          (unit.abbreviation && lowered.includes(unit.abbreviation.toLowerCase())),
      )
      .map((unit) => unit.id);
  }, [displayUnits, suggestedUnits]);

  useEffect(() => {
    setBrand(selection?.brand ?? "");
    if (suggestedUnitIds.length > 0) {
      setUnitId(suggestedUnitIds[0] ?? null);
    } else {
      setUnitId(null);
    }
  }, [selection, suggestedUnitIds]);

  const reset = () => {
    setQuantity("1");
    setLocationId(locations[0]?.id ?? null);
    setUnitId(null);
    setBrand(selection?.brand ?? "");
    setNotes("");
    setExpiresAt("");
    setError(null);
  };

  async function handleSave() {
    if (!selection) return;
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      setError("Enter a valid quantity");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/ingredients/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kitchenId,
          name: selection.name,
          brand: brand.trim() || undefined,
          quantity: qty,
          unitId: unitId || null,
          locationId: locationId || null,
          notes: notes.trim() || undefined,
          expiresAt: expiresAt || null,
          spoonacularId: selection.id != null ? Number(selection.id) : undefined,
          catalogType: selection.catalogType ?? "ingredient",
          source: selection.source ?? "spoonacular",
          imageUrl: selection.imageUrl ?? undefined,
          aisle: selection.aisle ?? undefined,
          possibleUnits: selection.possibleUnits ?? suggestedUnits,
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
        setError(message);
        return;
      }
      const unitLabel =
        displayUnits.find((unit) => unit.id === unitId)?.abbreviation ??
        displayUnits.find((unit) => unit.id === unitId)?.name ??
        null;
      onSuccess({ name: selection.name, quantity: qty, locationId, unitLabel });
      onOpenChange(false);
      reset();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not add item";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) reset(); }}>
      <SheetContent className="sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Add to kitchen</SheetTitle>
          <p className="text-sm text-muted-foreground">Save {title} to a storage location with quantity and unit.</p>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={title} readOnly />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                inputMode="decimal"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Select
                value={unitId ?? "none"}
                onValueChange={(value) => setUnitId(value === "none" ? null : value)}
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
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Location</Label>
              <Select value={locationId ?? undefined} onValueChange={(value) => setLocationId(value || null)}>
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
              <Label htmlFor="expires-at">Expires on (optional)</Label>
              <Input
                id="expires-at"
                type="date"
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="brand">Brand (optional)</Label>
            <Input id="brand" value={brand} onChange={(event) => setBrand(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="e.g., organic, sale item, use first"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <SheetFooter className="mt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Add to kitchen
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
