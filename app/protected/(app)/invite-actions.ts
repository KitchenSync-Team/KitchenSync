"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function acceptInvitation(formData: FormData): Promise<void> {
  const inviteId = formData.get("inviteId") as string | null;
  if (!inviteId) return;

  // Auth check uses the regular client (cookie-based session).
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth/login");
  }

  // All DB mutations use service role to bypass RLS on kitchen_invitations / kitchen_members.
  const admin = createServiceRoleClient();

  const { data: invite, error: inviteError } = await admin
    .from("kitchen_invitations")
    .select("id, kitchen_id, role, expires_at, accepted_at")
    .eq("id", inviteId)
    .maybeSingle();

  if (inviteError || !invite) return;
  if (invite.accepted_at) return;
  if (new Date(invite.expires_at) < new Date()) return;

  const { data: existingMember } = await admin
    .from("kitchen_members")
    .select("user_id")
    .eq("kitchen_id", invite.kitchen_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existingMember) {
    await admin.from("kitchen_members").insert({
      kitchen_id: invite.kitchen_id,
      user_id: user.id,
      role: invite.role ?? "member",
    });
  }

  await admin
    .from("kitchen_invitations")
    .update({
      accepted_at: new Date().toISOString(),
      accepted_by: user.id,
    })
    .eq("id", inviteId);

  revalidatePath("/protected");
  revalidatePath("/protected/kitchen-settings");
}
