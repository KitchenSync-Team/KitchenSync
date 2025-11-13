import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const locationSchema = z.object({
  name: z.string().min(1),
  icon: z.string().min(1).optional().nullable(),
  order: z.coerce.number().nonnegative().catch(0),
  source: z.enum(["default", "custom"]).optional(),
});

export type KitchenLocationInput = {
  name: string;
  icon: string | null;
  order: number;
};

export function extractLocationsFromFormData(formData: FormData): KitchenLocationInput[] {
  const rawLocations = formData.getAll("locationsPayload");
  return rawLocations
    .map((raw) => {
      if (typeof raw !== "string" || raw.trim().length === 0) {
        return null;
      }

      try {
        const value = locationSchema.parse(JSON.parse(raw));
        return {
          name: value.name.trim(),
          icon: value.icon ?? null,
          order: Number.isFinite(value.order) ? value.order : 0,
        };
      } catch {
        return null;
      }
    })
    .filter(
      (location): location is KitchenLocationInput =>
        Boolean(location && location.name.length > 0),
    );
}

export function dedupeLocations(locations: KitchenLocationInput[]): KitchenLocationInput[] {
  const seen = new Set<string>();
  return locations
    .sort((a, b) => a.order - b.order)
    .filter((location) => {
      const key = location.name.trim().toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .map((location, index) => ({
      name: location.name.trim(),
      icon: location.icon ?? null,
      order: index,
    }));
}

export async function syncKitchenLocations(
  supabase: SupabaseClient,
  kitchenId: string,
  locations: KitchenLocationInput[],
): Promise<{ success: true } | { success: false; error?: string }> {
  const timestamp = new Date().toISOString();

  const { data: existingLocations, error: loadLocationsError } = await supabase
    .from("locations")
    .select("id, name")
    .eq("kitchen_id", kitchenId);

  if (loadLocationsError) {
    return {
      success: false,
      error: loadLocationsError.message ?? "We couldn’t load existing locations.",
    };
  }

  const existingMap = new Map(
    (existingLocations ?? []).map((location) => [location.name.trim().toLowerCase(), location]),
  );

  const upsertRows = locations.map((location, index) => {
    const key = location.name.trim().toLowerCase();
    const match = existingMap.get(key);

    return {
      id: match?.id,
      kitchen_id: kitchenId,
      name: location.name.trim(),
      icon: location.icon,
      is_default: index === 0,
      sort_order: index,
      updated_at: timestamp,
    };
  });

  const idsToKeep = new Set(
    upsertRows
      .map((row) => row.id)
      .filter((value): value is string => typeof value === "string" && value.length > 0),
  );

  const locationsToRemove =
    existingLocations?.filter((location) => !idsToKeep.has(location.id)) ?? [];

  if (locationsToRemove.length > 0) {
    const { error: deleteError } = await supabase
      .from("locations")
      .delete()
      .eq("kitchen_id", kitchenId)
      .in(
        "id",
        locationsToRemove.map((location) => location.id),
      );

    if (deleteError && deleteError.code !== "42501") {
      return {
        success: false,
        error: deleteError.message ?? "We couldn’t remove old locations.",
      };
    }
  }

  const updates = upsertRows.filter(
    (row): row is typeof row & { id: string } =>
      typeof row.id === "string" && row.id.length > 0,
  );
  const inserts = upsertRows
    .filter((row) => !row.id)
    .map((row) => ({
      kitchen_id: row.kitchen_id,
      name: row.name,
      icon: row.icon,
      is_default: row.is_default,
      sort_order: row.sort_order,
      updated_at: row.updated_at,
    }));

  if (updates.length > 0) {
    const { error: updateError } = await supabase.from("locations").upsert(updates);
    if (updateError) {
      return {
        success: false,
        error: updateError.message ?? "We couldn’t update your locations.",
      };
    }
  }

  if (inserts.length > 0) {
    const { error: insertError } = await supabase.from("locations").insert(inserts);
    if (insertError) {
      return {
        success: false,
        error: insertError.message ?? "We couldn’t add your new locations.",
      };
    }
  }

  return { success: true };
}
