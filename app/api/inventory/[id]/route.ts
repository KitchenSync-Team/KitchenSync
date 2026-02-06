import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;

    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const quantity = typeof body.quantity === "number" ? body.quantity : Number(body.quantity);
    const unitId = typeof body.unitId === "string" ? body.unitId : null;
    const expiresAt = typeof body.expiresAt === "string" ? body.expiresAt : null;

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
    }

    const { data: updated, error: updateError } = await supabase
      .from("inventory")
      .update({
        quantity,
        unit_id: unitId,
        expires_at: expiresAt,
      })
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (updateError || !updated) {
      return NextResponse.json(
        { error: updateError?.message ?? "Unable to update inventory entry" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Inventory update error:", err);
    const detail = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "Server error", detail }, { status: 500 });
  }
}
