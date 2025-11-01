"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

import {
  ALLERGEN_OPTIONS,
  CUISINE_PREFERENCE_OPTIONS,
  DIETARY_OPTIONS,
  LOCATION_REQUIRED_ERROR_MESSAGE,
  PERSONALIZATION_DEFAULT,
  SEX_OPTIONS,
} from "./constants";
import { defaultOnboardingState, type OnboardingActionState } from "./action-state";

const locationSchema = z.object({
  name: z.string().min(1),
  icon: z.string().min(1).optional().nullable(),
  order: z.coerce.number().nonnegative().catch(0),
  source: z.enum(["default", "custom"]).optional(),
});

export async function completeOnboarding(
  _prevState: OnboardingActionState | undefined,
  formData: FormData,
): Promise<OnboardingActionState> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      redirect("/auth/login");
    }

    const kitchenId = formData.get("kitchenId");
    if (typeof kitchenId !== "string" || kitchenId.trim().length === 0) {
      return {
        status: "error",
        error: "We couldn't determine which kitchen to configure.",
      };
    }

    const kitchenNameRaw = formData.get("kitchenName");
    const kitchenName =
      typeof kitchenNameRaw === "string" ? kitchenNameRaw.trim().slice(0, 120) : "";

    const firstNameRaw = formData.get("firstName");
    const lastNameRaw = formData.get("lastName");
    const sexRaw = formData.get("sex");

    const firstName =
      typeof firstNameRaw === "string" ? firstNameRaw.trim().slice(0, 120) : "";
    const lastName = typeof lastNameRaw === "string" ? lastNameRaw.trim().slice(0, 120) : "";

    const allowedSexValues = new Set(SEX_OPTIONS.map((option) => option.value));
    const sex =
      typeof sexRaw === "string" && allowedSexValues.has(sexRaw) ? (sexRaw as string) : null;

    const allowedDietaryValues = new Set(DIETARY_OPTIONS.map((option) => option.value));
    const dietaryPreferences = Array.from(
      new Set(
        formData
          .getAll("dietaryPreferences")
          .filter((value): value is string => typeof value === "string")
          .map((value) => value.trim())
          .filter((value) => value.length > 0),
      ),
    ).filter((value) => allowedDietaryValues.has(value));

    const allowedAllergenValues = new Set(ALLERGEN_OPTIONS.map((option) => option.value));
    const allergens = Array.from(
      new Set(
        formData
          .getAll("allergens")
          .filter((value): value is string => typeof value === "string")
          .map((value) => value.trim())
          .filter((value) => value.length > 0),
      ),
    ).filter((value) => allowedAllergenValues.has(value));
    const allowedCuisineValues = new Set(
      CUISINE_PREFERENCE_OPTIONS.map((option) => option.value),
    );
    const cuisineLikes = Array.from(
      new Set(
        formData
          .getAll("cuisineLikes")
          .filter((value): value is string => typeof value === "string")
          .map((value) => value.trim())
          .filter((value) => value.length > 0),
      ),
    ).filter((value) => allowedCuisineValues.has(value));
    const cuisineDislikesRaw = Array.from(
      new Set(
        formData
          .getAll("cuisineDislikes")
          .filter((value): value is string => typeof value === "string")
          .map((value) => value.trim())
          .filter((value) => value.length > 0),
      ),
    ).filter((value) => allowedCuisineValues.has(value));
    const cuisineLikesSet = new Set(cuisineLikes);
    const cuisineDislikes = cuisineDislikesRaw.filter((value) => !cuisineLikesSet.has(value));

    const personalizeRaw = formData.get("personalizationOptIn");
    const personalizationOptIn =
      personalizeRaw == null
        ? PERSONALIZATION_DEFAULT
        : typeof personalizeRaw === "string"
          ? personalizeRaw === "true"
          : Boolean(personalizeRaw);

    const unitsSystemRaw = formData.get("unitsSystem");
    const unitsSystem =
      typeof unitsSystemRaw === "string" && unitsSystemRaw === "metric" ? "metric" : "imperial";

    const localeRaw = formData.get("locale");
    const locale =
      typeof localeRaw === "string" && localeRaw.trim().length > 0
        ? localeRaw.trim().slice(0, 32)
        : "en-US";

    const emailOptInRaw = formData.get("emailOptIn");
    const emailOptIn = emailOptInRaw === "true";

    const pushOptInRaw = formData.get("pushOptIn");
    const pushOptIn = pushOptInRaw === "true";

    const rawLocations = formData.getAll("locationsPayload");
    const parsedLocations = rawLocations
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
        (location): location is { name: string; icon: string | null; order: number } =>
          Boolean(location && location.name.length > 0),
      );

    if (parsedLocations.length === 0) {
      return {
        status: "error",
        error: LOCATION_REQUIRED_ERROR_MESSAGE,
      };
    }

    parsedLocations.sort((a, b) => a.order - b.order);

    const seenNames = new Set<string>();
    const uniqueLocations = parsedLocations.filter((location) => {
      const key = location.name.toLowerCase();
      if (seenNames.has(key)) {
        return false;
      }
      seenNames.add(key);
      return true;
    });

    const normalizedFirstName = firstName.length > 0 ? firstName : null;
    const normalizedLastName = lastName.length > 0 ? lastName : null;
    const derivedFullName =
      [normalizedFirstName, normalizedLastName].filter((value): value is string => Boolean(value))
        .join(" ")
        .trim() || null;

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        first_name: normalizedFirstName,
        last_name: normalizedLastName,
        full_name: derivedFullName,
        sex,
      })
      .eq("id", user.id);

    if (profileError) {
      return {
        status: "error",
        error: profileError.message ?? "We couldn’t update your profile.",
      };
    }

    const { error: upsertPreferencesError } = await supabase
      .from("user_preferences")
      .upsert(
        {
          user_id: user.id,
          default_kitchen_id: kitchenId,
          dietary_preferences: dietaryPreferences.length > 0 ? dietaryPreferences : null,
          allergens: allergens.length > 0 ? allergens : null,
          cuisine_likes: cuisineLikes.length > 0 ? cuisineLikes : null,
          cuisine_dislikes: cuisineDislikes.length > 0 ? cuisineDislikes : null,
          personalization_opt_in: personalizationOptIn,
          units_system: unitsSystem,
          locale,
          email_opt_in: emailOptIn,
          push_opt_in: pushOptIn,
        },
        { onConflict: "user_id" },
      );

    if (upsertPreferencesError) {
      return {
        status: "error",
        error: upsertPreferencesError.message ?? "We couldn’t save your preferences.",
      };
    }

    const { data: existingLocations, error: loadLocationsError } = await supabase
      .from("locations")
      .select("id, name")
      .eq("kitchen_id", kitchenId);

    if (loadLocationsError) {
      return {
        status: "error",
        error: loadLocationsError.message ?? "We couldn’t load existing locations.",
      };
    }

    const existingMap = new Map(
      (existingLocations ?? []).map((location) => [
        location.name.trim().toLowerCase(),
        location,
      ]),
    );

    const upsertRows = uniqueLocations.map((location, index) => {
      const key = location.name.trim().toLowerCase();
      const match = existingMap.get(key);

      return {
        id: match?.id,
        kitchen_id: kitchenId,
        name: location.name.trim(),
        icon: location.icon,
        is_default: index === 0,
        sort_order: index,
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
        .in(
          "id",
          locationsToRemove.map((location) => location.id),
        );

      if (deleteError && deleteError.code !== "42501") {
        return {
          status: "error",
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
      }));

    if (updates.length > 0) {
      const { error: updateError } = await supabase.from("locations").upsert(updates);
      if (updateError) {
        return {
          status: "error",
          error: updateError.message ?? "We couldn’t update your locations.",
        };
      }
    }

    if (inserts.length > 0) {
      const { error: insertError } = await supabase.from("locations").insert(inserts);
      if (insertError) {
        return {
          status: "error",
          error: insertError.message ?? "We couldn’t add your new locations.",
        };
      }
    }

    if (kitchenName.length > 0) {
      const { error: kitchenError } = await supabase
        .from("kitchens")
        .update({ name: kitchenName })
        .eq("id", kitchenId);

      if (kitchenError) {
        return {
          status: "error",
          error: kitchenError.message ?? "We couldn’t rename your kitchen.",
        };
      }
    }

    const { error: profileStatusError } = await supabase
      .from("profiles")
      .update({ onboarding_complete: true })
      .eq("id", user.id);

    if (profileStatusError) {
      return {
        status: "error",
        error: profileStatusError.message ?? "We couldn’t mark onboarding complete.",
      };
    }

    revalidatePath("/protected");
    revalidatePath("/protected/kitchen-settings");
    revalidatePath("/protected/profile");

    redirect("/protected");
  } catch (error) {
    const message =
      error instanceof Error && typeof error.message === "string"
        ? error.message
        : "Something went wrong while saving your setup. Please try again.";

    return {
      status: "error",
      error: message,
    };
  }

  return defaultOnboardingState;
}
