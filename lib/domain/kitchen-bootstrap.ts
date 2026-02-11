import type { SupabaseClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

type AuthUserLike = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

function deriveKitchenName(user: AuthUserLike) {
  const metadata = user.user_metadata ?? {};
  const firstName =
    typeof metadata.first_name === "string" ? metadata.first_name.trim() : "";
  const fullName =
    typeof metadata.full_name === "string" ? metadata.full_name.trim() : "";

  if (firstName.length > 0) {
    return `${firstName}'s Kitchen`;
  }
  if (fullName.length > 0) {
    return `${fullName}'s Kitchen`;
  }
  if (typeof user.email === "string" && user.email.includes("@")) {
    const local = user.email.split("@")[0]?.trim();
    if (local) {
      return `${local}'s Kitchen`;
    }
  }
  return "My Kitchen";
}

export async function ensureKitchenContext(
  _supabase: SupabaseClient,
  user: AuthUserLike,
): Promise<{ kitchenId: string }> {
  const admin = createServiceRoleClient();

  const [{ data: preferences }, { data: memberships, error: membershipError }] =
    await Promise.all([
      admin
        .from("user_preferences")
        .select("default_kitchen_id")
        .eq("user_id", user.id)
        .maybeSingle(),
      admin
        .from("kitchen_members")
        .select("kitchen_id")
        .eq("user_id", user.id)
        .order("joined_at", { ascending: true })
        .limit(1),
    ]);

  if (membershipError) {
    throw membershipError;
  }

  const existingKitchenId =
    preferences?.default_kitchen_id ??
    memberships?.[0]?.kitchen_id ??
    null;

  if (existingKitchenId) {
    await ensureMembershipAndDefaultKitchen(admin, user.id, existingKitchenId, "viewer");
    return { kitchenId: existingKitchenId };
  }

  const { data: ownerKitchen, error: ownerKitchenError } = await admin
    .from("kitchens")
    .select("id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (ownerKitchenError) {
    throw ownerKitchenError;
  }

  if (ownerKitchen?.id) {
    await ensureMembershipAndDefaultKitchen(admin, user.id, ownerKitchen.id, "owner");
    return { kitchenId: ownerKitchen.id };
  }

  const now = new Date().toISOString();
  const { data: newKitchen, error: kitchenInsertError } = await admin
    .from("kitchens")
    .insert({
      name: deriveKitchenName(user),
      icon_key: "chef-hat",
      owner_id: user.id,
      created_by: user.id,
      updated_at: now,
    })
    .select("id")
    .maybeSingle();

  if (kitchenInsertError || !newKitchen?.id) {
    throw kitchenInsertError ?? new Error("Failed to create an initial kitchen.");
  }

  await ensureMembershipAndDefaultKitchen(admin, user.id, newKitchen.id, "owner");

  return { kitchenId: newKitchen.id };
}

async function ensureMembershipAndDefaultKitchen(
  admin: ReturnType<typeof createServiceRoleClient>,
  userId: string,
  kitchenId: string,
  fallbackRole: "owner" | "editor" | "viewer",
) {
  const now = new Date().toISOString();
  const { error: membershipUpsertError } = await admin
    .from("kitchen_members")
    .upsert(
      {
        kitchen_id: kitchenId,
        user_id: userId,
        role: fallbackRole,
        joined_at: now,
        accepted_at: now,
        created_by: userId,
      },
      { onConflict: "kitchen_id,user_id" },
    );

  if (membershipUpsertError) {
    throw membershipUpsertError;
  }

  const { error: defaultPreferenceError } = await admin
    .from("user_preferences")
    .upsert(
      {
        user_id: userId,
        default_kitchen_id: kitchenId,
      },
      { onConflict: "user_id" },
    );

  if (defaultPreferenceError) {
    throw defaultPreferenceError;
  }
}
