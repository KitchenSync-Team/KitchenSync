import { NextResponse } from "next/server";

import { loadUserRecipeContext } from "@/lib/recipes/preferences";
import { requireAuthenticatedUser, requireKitchenMembershipForUser } from "@/lib/supabase/guards";

type InventoryRow = {
  id: string;
  quantity: number | string | null;
  expires_at: string | null;
  units:
    | {
        abbreviation: string | null;
        name: string | null;
      }
    | {
        abbreviation: string | null;
        name: string | null;
      }[]
    | null;
  items:
    | {
        id: string;
        name: string | null;
        spoonacular_ingredient_id: number | null;
        image_url: string | null;
        aisle: string | null;
        is_archived: boolean | null;
      }
    | {
        id: string;
        name: string | null;
        spoonacular_ingredient_id: number | null;
        image_url: string | null;
        aisle: string | null;
        is_archived: boolean | null;
      }[]
    | null;
};

type LocationRow = {
  id: string;
  name: string;
  sort_order: number | null;
  inventory: InventoryRow[] | null;
};

type PickerItem = {
  id: string;
  name: string;
  spoonacularIngredientId: number | null;
  quantity: number;
  unit: string | null;
  expiresAt: string | null;
  aisle: string | null;
  imageUrl: string | null;
};

export async function GET() {
  try {
    const auth = await requireAuthenticatedUser();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const { user } = auth;

    const context = await loadUserRecipeContext(user.id);
    if (!context.defaultKitchenId) {
      return NextResponse.json({ locations: [] });
    }

    const membership = await requireKitchenMembershipForUser(user, context.defaultKitchenId);
    if ("error" in membership) {
      return NextResponse.json({ error: membership.error }, { status: 403 });
    }

    const { admin } = membership;
    const { data, error } = await admin
      .from("locations")
      .select(
        `
          id,
          name,
          sort_order,
          inventory:inventory(
            id,
            quantity,
            expires_at,
            units(abbreviation, name),
            items(id, name, spoonacular_ingredient_id, image_url, aisle, is_archived)
          )
        `,
      )
      .eq("kitchen_id", context.defaultKitchenId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message ?? "Unable to load pantry items." }, { status: 500 });
    }

    const locations = ((data ?? []) as LocationRow[])
      .map((location) => {
        const grouped = new Map<string, PickerItem>();
        for (const inv of location.inventory ?? []) {
          const item = Array.isArray(inv.items) ? inv.items[0] ?? null : inv.items;
          if (!item || item.is_archived) continue;
          const name = typeof item.name === "string" ? item.name.trim() : "";
          if (!name) continue;
          const spoonacularIngredientId =
            typeof item.spoonacular_ingredient_id === "number" ? item.spoonacular_ingredient_id : null;
          const key = spoonacularIngredientId ? `id:${spoonacularIngredientId}` : `item:${item.id}`;
          const unitRel = Array.isArray(inv.units) ? inv.units[0] ?? null : inv.units;
          const unit = unitRel?.abbreviation ?? unitRel?.name ?? null;
          const quantity = parseQuantity(inv.quantity);
          const existing = grouped.get(key);
          if (existing) {
            existing.quantity += quantity;
            if (!existing.expiresAt || (inv.expires_at && inv.expires_at < existing.expiresAt)) {
              existing.expiresAt = inv.expires_at;
            }
            continue;
          }
          grouped.set(key, {
            id: key,
            name,
            spoonacularIngredientId,
            quantity,
            unit,
            expiresAt: inv.expires_at,
            aisle: item.aisle ?? null,
            imageUrl: item.image_url ?? null,
          });
        }
        return {
          id: location.id,
          name: location.name,
          sortOrder: location.sort_order ?? 0,
          items: Array.from(grouped.values()).sort((a, b) => a.name.localeCompare(b.name)),
        };
      })
      .filter((location) => location.items.length > 0)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

    return NextResponse.json({ locations });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "Server error", detail }, { status: 500 });
  }
}

function parseQuantity(value: number | string | null | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}
