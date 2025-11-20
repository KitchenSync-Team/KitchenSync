import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { fetchAndCacheGroceryProduct } from "@/lib/groceries/details";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idParam } = await context.params;

    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = Number(idParam);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
    }

    const result = await fetchAndCacheGroceryProduct({ productId: id });
    if (!result) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Grocery detail error:", err);
    const detail = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "Server error", detail }, { status: 500 });
  }
}
