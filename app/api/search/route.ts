import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const type = typeof body.type === "string" ? body.type : "ingredient";

    switch (type) {
      case "ingredient":
        return NextResponse.redirect(new URL("/api/ingredients/search", req.url), 307);
      case "map":
        return NextResponse.redirect(new URL("/api/ingredients/map", req.url), 307);
      default:
        return NextResponse.json({ error: "Invalid search type" }, { status: 400 });
    }
  } catch (err) {
    console.error("Unified search error:", err);
    const detail = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "Server error", detail }, { status: 500 });
  }
}
