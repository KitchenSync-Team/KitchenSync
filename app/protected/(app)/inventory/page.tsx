import { resolveKitchen } from "@/app/protected/_lib/resolve-kitchen";
import { formatInventoryItemName } from "@/lib/formatting/inventory";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import { InventoryClient } from "./inventory-client";

export default async function InventoryPage() {
  const kitchenSnapshot = await resolveKitchen();
  const { kitchen } = kitchenSnapshot;

  const admin = createServiceRoleClient();
  const [unitsResult, locationsResult] = await Promise.all([
    admin.from("units").select("id, name, abbreviation, type").order("name", { ascending: true }),
    admin
      .from("locations")
      .select(
        `
          id,
          name,
          icon,
          sort_order,
          inventory:inventory (
            id,
            item_id,
            quantity,
            expires_at,
            unit_id,
            items ( id, name, brand, image_url, aisle, ingredient_catalog_id, spoonacular_ingredient_id, ingredients_catalog ( possible_units ) ),
            units ( name, abbreviation )
          )
        `,
      )
      .eq("kitchen_id", kitchen.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(6, { foreignTable: "inventory" }),
  ]);

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6">
      <InventoryClient
        kitchenId={kitchen.id}
        units={(unitsResult.data ?? []).map((unit) => ({
          id: unit.id,
          name: unit.name,
          abbreviation: unit.abbreviation,
          type: unit.type,
        }))}
        locations={(locationsResult.data ?? []).map((loc) => ({
          id: loc.id,
          name: loc.name,
          icon: loc.icon,
          inventory: Array.isArray(loc.inventory)
            ? loc.inventory.map((row) => ({
              id: row.id,
              itemId: row.item_id,
              quantity: Number(row.quantity ?? 0),
              expiresAt: row.expires_at ?? null,
              unitId: row.unit_id ?? null,
              itemName: formatInventoryItemName(extractName(row.items)),
              possibleUnits: extractPossibleUnits(row.items),
              imageUrl: extractImage(row.items),
              aisle: extractAisle(row.items),
              unit: extractUnit(row.units),
            }))
            : [],
        }))}
      />
    </section>
  );
}

function extractName(
  item:
    | { name?: string | null }[]
    | { name?: string | null }
    | null
    | undefined,
): string {
  if (Array.isArray(item)) {
    return item[0]?.name ?? "Item";
  }
  return item?.name ?? "Item";
}

function extractUnit(
  unit:
    | { name?: string | null; abbreviation?: string | null }[]
    | { name?: string | null; abbreviation?: string | null }
    | null
    | undefined,
): string | null {
  if (Array.isArray(unit)) {
    const first = unit[0];
    if (!first) return null;
    return first.abbreviation ?? first.name ?? null;
  }
  if (!unit) return null;
  return unit.abbreviation ?? unit.name ?? null;
}

function extractImage(
  item:
    | { image_url?: string | null }[]
    | { image_url?: string | null }
    | null
    | undefined,
): string | null {
  if (Array.isArray(item)) {
    return item[0]?.image_url ?? null;
  }
  return item?.image_url ?? null;
}

function extractAisle(
  item:
    | { aisle?: string | null }[]
    | { aisle?: string | null }
    | null
    | undefined,
): string | null {
  if (Array.isArray(item)) {
    return item[0]?.aisle ?? null;
  }
  return item?.aisle ?? null;
}

function extractPossibleUnits(
  item:
    | { ingredients_catalog?: { possible_units?: string[] | null } | { possible_units?: string[] | null }[] }[]
    | { ingredients_catalog?: { possible_units?: string[] | null } | { possible_units?: string[] | null }[] }
    | null
    | undefined,
): string[] | null {
  if (!item) return null;
  const entry = Array.isArray(item) ? item[0] : item;
  if (!entry || !entry.ingredients_catalog) return null;
  const catalog = Array.isArray(entry.ingredients_catalog) ? entry.ingredients_catalog[0] : entry.ingredients_catalog;
  if (!catalog || !Array.isArray(catalog.possible_units)) return null;
  return catalog.possible_units;
}
