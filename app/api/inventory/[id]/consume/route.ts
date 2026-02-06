import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function POST(
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
    const amount = typeof body.amount === "number" ? body.amount : Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const { data: entry, error: fetchError } = await supabase
      .from("inventory")
      .select("id, quantity")
      .eq("id", id)
      .maybeSingle();

    if (fetchError || !entry) {
      return NextResponse.json(
        { error: fetchError?.message ?? "Inventory entry not found" },
        { status: 404 },
      );
    }

    const currentQuantity = typeof entry.quantity === "number" ? entry.quantity : Number(entry.quantity);
    if (!Number.isFinite(currentQuantity)) {
      return NextResponse.json({ error: "Invalid inventory quantity" }, { status: 500 });
    }

    const newQuantity = currentQuantity - amount;

    if (newQuantity <= 0) {
      const { error: deleteError } = await supabase.from("inventory").delete().eq("id", id);
      if (deleteError) {
        return NextResponse.json(
          { error: deleteError.message ?? "Unable to remove inventory entry" },
          { status: 500 },
        );
      }
      return NextResponse.json({ removed: true, quantity: 0 });
    }

    const { error: updateError } = await supabase
      .from("inventory")
      .update({ quantity: newQuantity })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message ?? "Unable to update inventory entry" },
        { status: 500 },
      );
    }

    return NextResponse.json({ removed: false, quantity: newQuantity });
  } catch (err) {
    console.error("Inventory consume error:", err);
    const detail = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "Server error", detail }, { status: 500 });
  }
}
