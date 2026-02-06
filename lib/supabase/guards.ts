import type { SupabaseClient, User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type KitchenRole = "owner" | "editor" | "viewer";

export type AuthGuardResult =
  | { user: User; supabase: SupabaseClient; error?: undefined }
  | { user?: undefined; supabase: SupabaseClient; error: string };

export type MembershipGuardResult =
  | { user: User; role: KitchenRole; admin: ReturnType<typeof createServiceRoleClient>; error?: undefined }
  | { user?: User; role?: KitchenRole; admin?: ReturnType<typeof createServiceRoleClient>; error: string };

export async function requireAuthenticatedUser(): Promise<AuthGuardResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, error: "Unauthorized" };
  }

  return { supabase, user };
}

export async function requireKitchenMembership(
  kitchenId: string,
): Promise<MembershipGuardResult> {
  const authResult = await requireAuthenticatedUser();
  if ("error" in authResult) {
    return { error: authResult.error };
  }

  return requireKitchenMembershipForUser(authResult.user, kitchenId);
}

export async function requireKitchenMembershipForUser(
  user: User,
  kitchenId: string,
): Promise<MembershipGuardResult> {
  const admin = createServiceRoleClient();
  const { data: membership, error } = await admin
    .from("kitchen_members")
    .select("role")
    .eq("kitchen_id", kitchenId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return { user, error: error.message ?? "Unable to validate kitchen access" };
  }

  if (!membership) {
    return { user, error: "You are not a member of this kitchen" };
  }

  const role: KitchenRole =
    membership.role === "owner" || membership.role === "editor" || membership.role === "viewer"
      ? membership.role
      : "viewer";

  return { user, role, admin };
}
