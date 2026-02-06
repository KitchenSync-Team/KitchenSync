import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "./service-role";

type InventoryRow = {
  id: string;
  kitchen_id: string | null;
  location_id: string | null;
  item_id: string | null;
  quantity: number | string | null;
  uom: string | null;
  expires_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type NewInventoryUnit = {
  kitchen_id: string;
  location_id?: string | null;
  item_id: string | null;
  quantity?: number | string | null;
  uom?: string | null;
  expires_at?: string | null;
};

export type UpdateInventoryUnit = Partial<NewInventoryUnit> & { id: string };

function handleError(error: PostgrestError | null): never | void {
  if (error) throw error;
}

/**
 * Create an inventory unit using the provided Supabase client (RLS applies).
 */
export async function createInventoryUnit(
  supabase: SupabaseClient,
  payload: NewInventoryUnit,
): Promise<InventoryRow> {
  const { data, error } = await supabase.from("inventory").insert(payload).select().maybeSingle();
  handleError(error);
  if (!data) throw new Error("Failed to create inventory unit");
  return data as InventoryRow;
}

/**
 * Create an inventory unit using the service role (bypasses RLS). Useful for admin tasks.
 */
export async function createInventoryUnitAdmin(payload: NewInventoryUnit): Promise<InventoryRow> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin.from("inventory").insert(payload).select().maybeSingle();
  handleError(error);
  if (!data) throw new Error("Failed to create inventory unit (admin)");
  return data as InventoryRow;
}

export async function getInventoryUnit(
  supabase: SupabaseClient,
  id: string,
): Promise<InventoryRow | null> {
  const { data, error } = await supabase.from("inventory").select("*").eq("id", id).maybeSingle();
  handleError(error);
  return (data as InventoryRow) ?? null;
}

export async function listInventoryUnits(
  supabase: SupabaseClient,
  kitchenId: string,
  opts?: { limit?: number; offset?: number; order?: { column: string; ascending?: boolean } },
): Promise<InventoryRow[]> {
  let query = supabase.from("inventory").select("*").eq("kitchen_id", kitchenId);
  if (opts?.order) query = query.order(opts.order.column, { ascending: opts.order.ascending ?? true });
  if (opts?.limit) query = query.limit(opts.limit);
  if (opts?.offset) query = query.range(opts.offset, (opts.offset ?? 0) + (opts.limit ?? 100) - 1);
  const { data, error } = await query;
  handleError(error);
  return (data as InventoryRow[]) ?? [];
}

export async function updateInventoryUnit(
  supabase: SupabaseClient,
  payload: UpdateInventoryUnit,
): Promise<InventoryRow> {
  const { id, ...rest } = payload;
  const { data, error } = await supabase.from("inventory").update(rest).eq("id", id).select().maybeSingle();
  handleError(error);
  if (!data) throw new Error("Failed to update inventory unit");
  return data as InventoryRow;
}

export async function deleteInventoryUnit(
  supabase: SupabaseClient,
  id: string,
): Promise<boolean> {
  const { error } = await supabase.from("inventory").delete().eq("id", id);
  handleError(error);
  return true;
}

/**
 * Reconcile a unit quantity (idempotent - sets quantity to provided value).
 */
export async function reconcileInventoryUnit(
  supabase: SupabaseClient,
  id: string,
  quantity: number | string | null,
): Promise<InventoryRow> {
  const { data, error } = await supabase.from("inventory").update({ quantity }).eq("id", id).select().maybeSingle();
  handleError(error);
  if (!data) throw new Error("Failed to reconcile inventory unit");
  return data as InventoryRow;
}
