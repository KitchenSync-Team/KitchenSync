"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  dedupeLocations,
  extractLocationsFromFormData,
  syncKitchenLocations,
} from "@/app/protected/_lib/kitchen-location-utils";
import { LOCATION_REQUIRED_ERROR_MESSAGE } from "@/app/protected/onboarding/constants";

import { defaultKitchenIconId, isKitchenIconId } from "@/components/navigation/kitchen-icons";

import { type KitchenSettingsActionState } from "./action-state";

type SupabaseClientType = Awaited<ReturnType<typeof createClient>>;

async function fetchMemberRole(
  supabase: SupabaseClientType,
  kitchenId: string,
  userId: string,
): Promise<{ role?: "owner" | "editor" | "viewer"; error?: string }> {
  const { data, error } = await supabase
    .from("kitchen_members")
    .select("role")
    .eq("kitchen_id", kitchenId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return { error: "You’re not a member of this kitchen." };
  }

  const role =
    data.role === "owner" || data.role === "editor" || data.role === "viewer"
      ? data.role
      : "viewer";

  return { role };
}

function revalidateKitchenSettingsPaths() {
  revalidatePath("/protected/kitchen-settings");
  revalidatePath("/protected");
}

export async function updateKitchenSettings(
  _prevState: KitchenSettingsActionState,
  formData: FormData,
): Promise<KitchenSettingsActionState> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return {
          status: "error",
          error: "Sign in again to update this kitchen.",
        };
    }

    const kitchenId = formData.get("kitchenId");
    if (typeof kitchenId !== "string" || kitchenId.trim().length === 0) {
      return {
        status: "error",
        error: "We couldn't determine which kitchen to configure.",
      };
    }

    const parsedLocations = extractLocationsFromFormData(formData);
    if (parsedLocations.length === 0) {
      return {
        status: "error",
        error: LOCATION_REQUIRED_ERROR_MESSAGE,
      };
    }

    const uniqueLocations = dedupeLocations(parsedLocations);
    if (uniqueLocations.length === 0) {
      return {
        status: "error",
        error: LOCATION_REQUIRED_ERROR_MESSAGE,
      };
    }

    const { role, error: roleError } = await fetchMemberRole(supabase, kitchenId, user.id);
    if (roleError || !role) {
      return {
        status: "error",
        error: roleError ?? "You’re not a member of this kitchen.",
      };
    }

    if (role === "viewer") {
      return {
        status: "error",
        error: "You need editor access to change kitchen settings.",
      };
    }

    const syncResult = await syncKitchenLocations(supabase, kitchenId, uniqueLocations);
    if (!syncResult.success) {
      return {
        status: "error",
        error: syncResult.error ?? "We couldn’t update your locations.",
      };
    }

    revalidateKitchenSettingsPaths();

    return { status: "success" };
  } catch (error) {
    const message =
      error instanceof Error && typeof error.message === "string"
        ? error.message
        : "Something went wrong while saving your kitchen.";

    return {
      status: "error",
      error: message,
    };
  }
}

export async function renameKitchen(
  prevState: KitchenSettingsActionState,
  formData: FormData,
): Promise<KitchenSettingsActionState> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        status: "error",
        error: "Sign in again to update this kitchen.",
      };
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

    if (kitchenName.length === 0) {
      return {
        status: "error",
        error: "Give your kitchen a name before saving.",
      };
    }

    const iconKeyRaw = formData.get("iconKey");
    const iconKey =
      typeof iconKeyRaw === "string" && isKitchenIconId(iconKeyRaw) ? iconKeyRaw : defaultKitchenIconId;

    const { role, error: roleError } = await fetchMemberRole(supabase, kitchenId, user.id);
    if (roleError || !role) {
      return {
        status: "error",
        error: roleError ?? "You’re not a member of this kitchen.",
      };
    }

    if (role === "viewer") {
      return {
        status: "error",
        error: "You need editor access to change kitchen settings.",
      };
    }

    const updatedTimestamp = new Date().toISOString();

    const { error: kitchenError } = await supabase
      .from("kitchens")
      .update({ name: kitchenName, icon_key: iconKey, updated_at: updatedTimestamp })
      .eq("id", kitchenId);

    if (kitchenError) {
      return {
        status: "error",
        error: kitchenError.message ?? "We couldn’t rename your kitchen.",
      };
    }

    revalidateKitchenSettingsPaths();

    return { status: "success" };
  } catch (error) {
    const message =
      error instanceof Error && typeof error.message === "string"
        ? error.message
        : "Something went wrong while saving your kitchen.";

    return {
      status: "error",
      error: message,
    };
  }
}
