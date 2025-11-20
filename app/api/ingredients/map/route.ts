import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { mapIngredientsToProducts } from "@/lib/ingredients/map";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const ingredients = Array.isArray(body.ingredients)
      ? (body.ingredients as unknown[]).filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      : [];
    const servings =
      typeof body.servings === "number" && Number.isFinite(body.servings)
        ? Math.max(1, Math.floor(body.servings))
        : undefined;

    if (ingredients.length === 0) {
      return NextResponse.json({ error: "At least one ingredient is required" }, { status: 400 });
    }

    const result = await mapIngredientsToProducts({ ingredients, servings });
    return NextResponse.json(result);
  } catch (err) {
    console.error("Ingredients map error:", err);
    const detail = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "Server error", detail }, { status: 500 });
  }
}
