import { resolveKitchen } from "@/app/protected/_lib/resolve-kitchen";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import { IngredientClient } from "./ingredient-client";

export default async function IngredientsPage() {
  const kitchenSnapshot = await resolveKitchen();
  const { kitchen } = kitchenSnapshot;

  const admin = createServiceRoleClient();
  const [unitsResult, locationsResult] = await Promise.all([
    admin.from("units").select("id, name, abbreviation, type").order("name", { ascending: true }),
    admin
      .from("locations")
      .select("id, name, icon")
      .eq("kitchen_id", kitchen.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Pantry assistant</p>
        <h1 className="text-2xl font-semibold tracking-tight">Add ingredients to your kitchen</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Search Spoonacular for fresh ingredients, then drop them straight into your locations with the right quantity, unit, and expiration.
        </p>
      </div>

      <IngredientClient
        kitchenId={kitchen.id}
        locations={(locationsResult.data ?? []).map((loc) => ({
          id: loc.id,
          name: loc.name,
          icon: loc.icon,
        }))}
        units={(unitsResult.data ?? []).map((unit) => ({
          id: unit.id,
          name: unit.name,
          abbreviation: unit.abbreviation,
          type: unit.type,
        }))}
        preferences={kitchenSnapshot.preferences}
      />
    </section>
  );
}
