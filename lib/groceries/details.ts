import { buildSpoonacularUrl, getSpoonacularClient } from "@/lib/spoonacular/client";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type ProductDetail = {
  id: number;
  title: string;
  image?: string;
  badges?: unknown;
  nutrition?: unknown;
  ingredientCount?: number;
  ingredientList?: string;
  aisle?: string;
  price?: number;
  servings?: unknown;
  upc?: string;
};

export async function fetchAndCacheGroceryProduct({ productId }: { productId: number }) {
  const client = getSpoonacularClient();

  const admin = createServiceRoleClient();

  const { data: existing, error: existingErr } = await admin
    .from("grocery_products")
    .select("id, title, image_url, badges, nutrition, raw, upc, category, brand")
    .eq("spoonacular_id", productId)
    .maybeSingle();

  if (existingErr) {
    console.error("grocery_products lookup error:", existingErr);
  }

  if (existing) {
    return toResponse(existing);
  }

  const url = buildSpoonacularUrl(client, `/food/products/${productId}`);
  const apiRes = await fetch(url, { headers: client.headers });
  const raw = (await apiRes.json()) as ProductDetail;
  if (!apiRes.ok) {
    throw new Error(`Spoonacular product error: ${apiRes.status}`);
  }

  const { data: inserted, error: insertErr } = await admin
    .from("grocery_products")
    .insert({
      spoonacular_id: raw.id,
      title: raw.title,
      image_url: normalizeImage(raw.id, raw.image),
      badges: raw.badges ?? null,
      nutrition: raw.nutrition ?? null,
      raw,
      category: raw.ingredientList ? raw.ingredientList : null,
    })
    .select("id, title, image_url, badges, nutrition, raw, upc, category, brand")
    .maybeSingle();

  if (insertErr) {
    console.error("grocery_products insert error:", insertErr);
  }

  return inserted ? toResponse(inserted) : null;
}

export async function fetchAndCacheGroceryProductByUpc({ upc }: { upc: string }) {
  const client = getSpoonacularClient();

  const admin = createServiceRoleClient();

  const { data: existing, error: existingErr } = await admin
    .from("grocery_products")
    .select("id, title, image_url, badges, nutrition, raw, upc")
    .eq("upc", upc)
    .maybeSingle();

  if (existingErr) {
    console.error("grocery_products UPC lookup error:", existingErr);
  }

  if (existing) return toResponse(existing);

  const url = buildSpoonacularUrl(client, `/food/products/upc/${encodeURIComponent(upc)}`);
  const apiRes = await fetch(url, { headers: client.headers });
  const raw = (await apiRes.json()) as ProductDetail;
  if (!apiRes.ok) {
    throw new Error(`Spoonacular product UPC error: ${apiRes.status}`);
  }

  const { data: inserted, error: insertErr } = await admin
    .from("grocery_products")
    .insert({
      spoonacular_id: raw.id,
      title: raw.title,
      image_url: normalizeImage(raw.id, raw.image),
      badges: raw.badges ?? null,
      nutrition: raw.nutrition ?? null,
      raw,
      upc,
      category: raw.ingredientList ? raw.ingredientList : null,
    })
    .select("id, title, image_url, badges, nutrition, raw, upc, category, brand")
    .maybeSingle();

  if (insertErr) {
    console.error("grocery_products insert UPC error:", insertErr);
  }

  return inserted ? toResponse(inserted) : null;
}

function normalizeImage(id: number | undefined, imageType?: string) {
  if (!id || !imageType) return null;
  if (imageType.startsWith("http")) return imageType;
  return `https://img.spoonacular.com/products/${id}-312x231.${imageType.replace(".", "")}`;
}

function toResponse(row: {
  id: string;
  title: string;
  image_url?: string | null;
  badges?: unknown;
  nutrition?: unknown;
  raw?: unknown;
  upc?: string | null;
  category?: unknown;
  brand?: unknown;
}) {
  const raw = row.raw as ProductDetail | undefined;
  return {
    id: row.id,
    title: row.title,
    image: row.image_url ?? null,
    badges: Array.isArray(raw?.badges) ? raw?.badges : row.badges,
    nutrition: raw?.nutrition ?? row.nutrition,
    ingredientList: raw?.ingredientList,
    upc: row.upc ?? null,
    servings: raw?.servings,
    price: raw?.price,
    aisle: raw?.aisle,
    brand: typeof row.brand === "string" ? row.brand : undefined,
  };
}
