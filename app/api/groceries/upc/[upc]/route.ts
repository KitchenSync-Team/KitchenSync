import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { fetchAndCacheGroceryProductByUpc } from "@/lib/groceries/details";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ upc: string }> },
) {
  try {
    const { upc: upcParam } = await context.params;

    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const upc = upcParam?.trim();
    if (!upc) {
      return NextResponse.json({ error: "UPC is required" }, { status: 400 });
    }

    const result = await fetchAndCacheGroceryProductByUpc({ upc });
    if (!result) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Grocery UPC detail error:", err);
    const detail = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "Server error", detail }, { status: 500 });
  }
}
