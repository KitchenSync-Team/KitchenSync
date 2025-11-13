"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { ROLE_OPTIONS, type KitchenRole } from "@/components/kitchen-settings/roles";

export type MemberActionResult = { success: true } | { success: false; error: string };

export type RoleOption = KitchenRole;

type MembershipRecord = {
  role: RoleOption;
};

async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, error: "Sign in to manage kitchen members." as const };
  }
  return { supabase, user };
}

async function getMembership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  kitchenId: string,
  userId: string,
): Promise<{ record?: MembershipRecord; error?: string }> {
  const { data, error } = await supabase
    .from("kitchen_members")
    .select("role")
    .eq("kitchen_id", kitchenId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return { error: "You’re not a member of this kitchen." };
  }

  const role = ROLE_OPTIONS.includes(data.role as RoleOption)
    ? (data.role as RoleOption)
    : "member";

  return { record: { role } };
}

function canManage(role: RoleOption) {
  return role === "owner";
}

async function ensureManagePermissions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  kitchenId: string,
  userId: string,
): Promise<{ role?: RoleOption; error?: string }> {
  const { record, error } = await getMembership(supabase, kitchenId, userId);
  if (error || !record) {
    return { error: error ?? "You’re not a member of this kitchen." };
  }
  if (!canManage(record.role)) {
    return { error: "You need editor access to manage members." };
  }
  return { role: record.role };
}

async function countOwners(
  supabase: Awaited<ReturnType<typeof createClient>>,
  kitchenId: string,
): Promise<{ owners: number; error?: string }> {
  const { data, error } = await supabase
    .from("kitchen_members")
    .select("role")
    .eq("kitchen_id", kitchenId);

  if (error || !data) {
    return { owners: 0, error: error?.message ?? "Unable to load member roster." };
  }

  const owners = data.filter((row) => row.role === "owner").length;
  return { owners };
}

function revalidateKitchenSettings() {
  revalidatePath("/protected/kitchen-settings");
  revalidatePath("/protected");
}

function normalizeRole(role: string): RoleOption {
  return ROLE_OPTIONS.includes(role as RoleOption) ? (role as RoleOption) : "member";
}

export async function inviteMember(input: {
  kitchenId: string;
  email: string;
  role: RoleOption;
}): Promise<MemberActionResult> {
  try {
    const { supabase, user, error } = await getCurrentUser();
    if (!user || error) {
      return { success: false, error: error ?? "Sign in to manage kitchen members." };
    }

    const kitchenId = input.kitchenId.trim();
    if (!kitchenId) {
      return { success: false, error: "Missing kitchen reference." };
    }

    const email = input.email.trim().toLowerCase();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return { success: false, error: "Enter a valid email address." };
    }

    const requestedRole = normalizeRole(input.role);

    const { role, error: permissionError } = await ensureManagePermissions(
      supabase,
      kitchenId,
      user.id,
    );
    if (permissionError || !role) {
      return { success: false, error: permissionError ?? "Insufficient permissions." };
    }

    if (requestedRole === "owner" && role !== "owner") {
      return { success: false, error: "Only owners can invite another owner." };
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { error: insertError } = await supabase.from("kitchen_invitations").insert({
      kitchen_id: kitchenId,
      email,
      role: requestedRole,
      invited_by: user.id,
      expires_at: expiresAt,
    });

    if (insertError) {
      return {
        success: false,
        error: insertError.message ?? "We couldn’t create that invitation.",
      };
    }

    revalidateKitchenSettings();
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unexpected error inviting member.",
    };
  }
}

export async function cancelInvitation(input: {
  kitchenId: string;
  invitationId: string;
}): Promise<MemberActionResult> {
  try {
    const { supabase, user, error } = await getCurrentUser();
    if (!user || error) {
      return { success: false, error: error ?? "Sign in to manage kitchen members." };
    }

    const kitchenId = input.kitchenId.trim();
    const invitationId = input.invitationId.trim();
    if (!kitchenId || !invitationId) {
      return { success: false, error: "Missing invitation details." };
    }

    const { error: permissionError } = await ensureManagePermissions(supabase, kitchenId, user.id);
    if (permissionError) {
      return { success: false, error: permissionError };
    }

    const { error: deleteError } = await supabase
      .from("kitchen_invitations")
      .delete()
      .eq("id", invitationId)
      .eq("kitchen_id", kitchenId)
      .is("accepted_at", null);

    if (deleteError) {
      return {
        success: false,
        error: deleteError.message ?? "We couldn’t cancel that invite.",
      };
    }

    revalidateKitchenSettings();
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unexpected error canceling invite.",
    };
  }
}

export async function resendInvitation(input: {
  kitchenId: string;
  invitationId: string;
}): Promise<MemberActionResult> {
  try {
    const { supabase, user, error } = await getCurrentUser();
    if (!user || error) {
      return { success: false, error: error ?? "Sign in to manage kitchen members." };
    }

    const kitchenId = input.kitchenId.trim();
    const invitationId = input.invitationId.trim();
    if (!kitchenId || !invitationId) {
      return { success: false, error: "Missing invitation details." };
    }

    const { error: permissionError } = await ensureManagePermissions(supabase, kitchenId, user.id);
    if (permissionError) {
      return { success: false, error: permissionError };
    }

    const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { error: updateError } = await supabase
      .from("kitchen_invitations")
      .update({ expires_at: newExpiry })
      .eq("id", invitationId)
      .eq("kitchen_id", kitchenId)
      .is("accepted_at", null);

    if (updateError) {
      return {
        success: false,
        error: updateError.message ?? "We couldn’t resend that invite.",
      };
    }

    revalidateKitchenSettings();
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unexpected error resending invite.",
    };
  }
}

export async function updateMemberRole(input: {
  kitchenId: string;
  memberId: string;
  role: RoleOption;
}): Promise<MemberActionResult> {
  try {
    const { supabase, user, error } = await getCurrentUser();
    if (!user || error) {
      return { success: false, error: error ?? "Sign in to manage kitchen members." };
    }

    const kitchenId = input.kitchenId.trim();
    const memberId = input.memberId.trim();
    const targetRole = normalizeRole(input.role);

    if (!kitchenId || !memberId) {
      return { success: false, error: "Missing member details." };
    }

    const { role: actorRole, error: permissionError } = await ensureManagePermissions(
      supabase,
      kitchenId,
      user.id,
    );
    if (permissionError || !actorRole) {
      return { success: false, error: permissionError ?? "Insufficient permissions." };
    }

    if (actorRole !== "owner") {
      return { success: false, error: "Only owners can update member roles." };
    }

    const { data: targetData, error: targetError } = await supabase
      .from("kitchen_members")
      .select("role")
      .eq("kitchen_id", kitchenId)
      .eq("user_id", memberId)
      .maybeSingle();

    if (targetError || !targetData) {
      return { success: false, error: "We couldn’t find that member." };
    }

    const currentRole = normalizeRole(targetData.role);

    const { owners, error: ownersError } = await countOwners(supabase, kitchenId);
    if (ownersError) {
      return { success: false, error: ownersError };
    }

    if (currentRole === "owner" && targetRole !== "owner" && owners <= 1) {
      return { success: false, error: "You need another owner before demoting this one." };
    }

    const { error: updateError } = await supabase
      .from("kitchen_members")
      .update({ role: targetRole })
      .eq("kitchen_id", kitchenId)
      .eq("user_id", memberId);

    if (updateError) {
      return {
        success: false,
        error: updateError.message ?? "We couldn’t update that role.",
      };
    }

    revalidateKitchenSettings();
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unexpected error updating member role.",
    };
  }
}

export async function removeMember(input: {
  kitchenId: string;
  memberId: string;
}): Promise<MemberActionResult> {
  try {
    const { supabase, user, error } = await getCurrentUser();
    if (!user || error) {
      return { success: false, error: error ?? "Sign in to manage kitchen members." };
    }

    const kitchenId = input.kitchenId.trim();
    const memberId = input.memberId.trim();

    if (!kitchenId || !memberId) {
      return { success: false, error: "Missing member details." };
    }

    const { role: actorRole, error: permissionError } = await ensureManagePermissions(
      supabase,
      kitchenId,
      user.id,
    );
    if (permissionError || !actorRole) {
      return { success: false, error: permissionError ?? "Insufficient permissions." };
    }

    const { data: targetData, error: targetError } = await supabase
      .from("kitchen_members")
      .select("role")
      .eq("kitchen_id", kitchenId)
      .eq("user_id", memberId)
      .maybeSingle();

    if (targetError || !targetData) {
      return { success: false, error: "We couldn’t find that member." };
    }

    const targetRole = normalizeRole(targetData.role);

    if (targetRole === "owner" && actorRole !== "owner") {
      return { success: false, error: "Only owners can remove another owner." };
    }

    const { owners, error: ownersError } = await countOwners(supabase, kitchenId);
    if (ownersError) {
      return { success: false, error: ownersError };
    }

    if (targetRole === "owner" && owners <= 1) {
      return { success: false, error: "You can’t remove the last owner." };
    }

    if (memberId === user.id && targetRole === "owner" && owners <= 1) {
      return { success: false, error: "Add another owner before leaving this kitchen." };
    }

    const { error: deleteError } = await supabase
      .from("kitchen_members")
      .delete()
      .eq("kitchen_id", kitchenId)
      .eq("user_id", memberId);

    if (deleteError) {
      return {
        success: false,
        error: deleteError.message ?? "We couldn’t remove that member.",
      };
    }

    revalidateKitchenSettings();
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unexpected error removing member.",
    };
  }
}
