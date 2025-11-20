import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import type { AddIngredientPayload } from "@/lib/ingredients/types";
import { loadUserRecipeContext } from "@/lib/recipes/preferences";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const payload = parsePayload(body);
    if (!payload.name) {
      return NextResponse.json({ error: "Item name is required" }, { status: 400 });
    }

    const userContext = await loadUserRecipeContext(user.id);
    const kitchenId = userContext.defaultKitchenId;
    if (!kitchenId) {
      return NextResponse.json({ error: "No kitchen found for user" }, { status: 400 });
    }

    const admin = createServiceRoleClient();

    const { data: membership } = await admin
      .from("kitchen_members")
      .select("role")
      .eq("kitchen_id", kitchenId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: "You are not a member of this kitchen" }, { status: 403 });
    }

    const catalogType: "ingredient" | "grocery" = payload.catalogType === "grocery" ? "grocery" : "ingredient";

    // Upsert catalog entry if spoonacular id present
    let catalogId: string | null = null;
    if (typeof payload.spoonacularId === "number" && Number.isFinite(payload.spoonacularId)) {
      if (catalogType === "ingredient") {
        const { data: existing, error: existingErr } = await admin
          .from("ingredients_catalog")
          .select("id")
          .eq("spoonacular_id", payload.spoonacularId)
          .maybeSingle();
        if (existingErr) console.error("ingredients_catalog lookup error:", existingErr);
        if (existing?.id) {
          catalogId = existing.id;
        } else {
          const { data: inserted, error: insertErr } = await admin
            .from("ingredients_catalog")
            .insert({
              spoonacular_id: payload.spoonacularId,
              name: payload.name,
              brand: payload.brand ?? null,
              aisle: payload.aisle ?? null,
              category: payload.category ?? null,
              image_url: payload.imageUrl ?? null,
              possible_units: payload.possibleUnits ?? null,
              badges: payload.badges ?? null,
              raw: payload.raw ?? null,
            })
            .select("id")
            .maybeSingle();
          if (insertErr) console.error("ingredients_catalog insert error:", insertErr);
          catalogId = inserted?.id ?? null;
        }
      } else {
        const { data: existing, error: existingErr } = await admin
          .from("grocery_products")
          .select("id")
          .eq("spoonacular_id", payload.spoonacularId)
          .maybeSingle();
        if (existingErr) console.error("grocery_products lookup error:", existingErr);
        if (existing?.id) {
          catalogId = existing.id;
        } else {
          const { data: inserted, error: insertErr } = await admin
            .from("grocery_products")
            .insert({
              spoonacular_id: payload.spoonacularId,
              title: payload.name,
              brand: payload.brand ?? null,
              category: payload.category ?? null,
              image_url: payload.imageUrl ?? null,
              badges: payload.badges ?? null,
              raw: payload.raw ?? null,
            })
            .select("id")
            .maybeSingle();
          if (insertErr) console.error("grocery_products insert error:", insertErr);
          catalogId = inserted?.id ?? null;
        }
      }
    }

    const ingredientCatalogId = catalogType === "ingredient" ? catalogId : null;
    const groceryProductId = catalogType === "grocery" ? catalogId : null;
    const spoonacularIngredientId =
      catalogType === "ingredient" && typeof payload.spoonacularId === "number"
        ? payload.spoonacularId
        : null;

    // Find existing item by spoonacular id / catalog first, then name fallback
    let itemId: string | null = null;

    if (spoonacularIngredientId !== null) {
      const { data: externalItemMatch, error: externalItemMatchError } = await admin
        .from("items")
        .select("id")
        .eq("kitchen_id", kitchenId)
        .eq("spoonacular_ingredient_id", spoonacularIngredientId)
        .eq("is_archived", false)
        .maybeSingle();

      if (externalItemMatchError) {
        console.error("Item spoonacular match error:", externalItemMatchError);
      }

      itemId = externalItemMatch?.id ?? null;
    }

    if (!itemId && ingredientCatalogId) {
      const { data: catalogMatch, error: catalogMatchError } = await admin
        .from("items")
        .select("id")
        .eq("kitchen_id", kitchenId)
        .eq("ingredient_catalog_id", ingredientCatalogId)
        .eq("is_archived", false)
        .maybeSingle();

      if (catalogMatchError) console.error("Item ingredient catalog match error:", catalogMatchError);
      itemId = catalogMatch?.id ?? null;
    }

    if (!itemId && groceryProductId) {
      const { data: groMatch, error: groMatchError } = await admin
        .from("items")
        .select("id")
        .eq("kitchen_id", kitchenId)
        .eq("grocery_product_id", groceryProductId)
        .eq("is_archived", false)
        .maybeSingle();

      if (groMatchError) console.error("Item grocery catalog match error:", groMatchError);
      itemId = groMatch?.id ?? null;
    }

    if (!itemId) {
      const { data: existingItem, error: existingError } = await admin
        .from("items")
        .select("id")
        .eq("kitchen_id", kitchenId)
        .ilike("name", payload.name)
        .eq("is_archived", false)
        .maybeSingle();

      if (existingError) {
        console.error("Item lookup error:", existingError);
      }

      itemId = existingItem?.id ?? null;
    }

    if (!itemId) {
      const { data: newItem, error: insertItemError } = await admin
        .from("items")
        .insert({
          name: payload.name,
          brand: payload.brand ?? null,
          category: payload.category ?? null,
          kitchen_id: kitchenId,
          created_by: user.id,
          notes: payload.notes ?? null,
          ingredient_catalog_id: ingredientCatalogId,
          grocery_product_id: groceryProductId,
          spoonacular_ingredient_id: spoonacularIngredientId,
          image_url: payload.imageUrl ?? null,
          aisle: payload.aisle ?? null,
        })
        .select("id")
        .maybeSingle();

      if (insertItemError || !newItem) {
        const detail =
          insertItemError?.message ?? "Unable to create item. Please try again.";
        return NextResponse.json({ error: detail }, { status: 500 });
      }

      itemId = newItem.id;
    } else if (itemId) {
      const { error: updateItemError } = await admin
        .from("items")
        .update({
          ingredient_catalog_id: ingredientCatalogId ?? null,
          grocery_product_id: groceryProductId ?? null,
          spoonacular_ingredient_id: spoonacularIngredientId,
          image_url: payload.imageUrl ?? null,
          aisle: payload.aisle ?? null,
        })
        .eq("id", itemId);

      if (updateItemError) {
        console.error("Item catalog link update error:", updateItemError);
      }
    }

    const quantity = typeof payload.quantity === "number" && payload.quantity > 0 ? payload.quantity : 1;

    const { data: inventoryRow, error: insertInventoryError } = await admin
      .from("inventory")
      .insert({
        item_id: itemId,
        kitchen_id: kitchenId,
        location_id: payload.locationId ?? null,
        unit_id: payload.unitId ?? null,
        quantity,
        expires_at: payload.expiresAt ?? null,
        notes: payload.notes ?? null,
        created_by: user.id,
        source: "spoonacular",
      })
      .select("id")
      .maybeSingle();

    if (insertInventoryError || !inventoryRow) {
      const detail =
        insertInventoryError?.message ?? "Unable to add inventory. Please try again.";
      return NextResponse.json({ error: detail }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      itemId,
      inventoryId: inventoryRow.id,
    });
  } catch (err) {
    console.error("Add ingredient error:", err);
    const detail = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "Server error", detail }, { status: 500 });
  }
}

function parsePayload(body: Record<string, unknown>): AddIngredientPayload {
  return {
    name: typeof body.name === "string" ? body.name.trim() : "",
    brand: typeof body.brand === "string" ? body.brand.trim() : undefined,
    category: typeof body.category === "string" ? body.category.trim() : undefined,
    quantity:
      typeof body.quantity === "number" && Number.isFinite(body.quantity) ? body.quantity : undefined,
    unitId: typeof body.unitId === "string" ? body.unitId : null,
    locationId: typeof body.locationId === "string" ? body.locationId : null,
    expiresAt: typeof body.expiresAt === "string" ? body.expiresAt : null,
    notes: typeof body.notes === "string" ? body.notes.trim() : undefined,
    spoonacularId:
      typeof body.spoonacularId === "number" && Number.isFinite(body.spoonacularId)
        ? body.spoonacularId
        : typeof body.spoonacularId === "string" && body.spoonacularId.trim()
          ? Number(body.spoonacularId)
          : undefined,
    catalogType: body.catalogType === "grocery" ? "grocery" : "ingredient",
    imageUrl: typeof body.imageUrl === "string" ? body.imageUrl.trim() : undefined,
    aisle: typeof body.aisle === "string" ? body.aisle.trim() : undefined,
    possibleUnits: Array.isArray(body.possibleUnits)
      ? (body.possibleUnits as unknown[])
          .filter((value): value is string => typeof value === "string")
          .map((value) => value.trim())
          .filter(Boolean)
      : undefined,
    badges:
      typeof body.badges === "object" && body.badges !== null
        ? (body.badges as Record<string, unknown>)
        : undefined,
    raw:
      typeof body.raw === "object" && body.raw !== null ? (body.raw as Record<string, unknown>) : undefined,
  };
}
