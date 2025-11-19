import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "./service-role";

type InventoryUnitRow = {
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
): Promise<InventoryUnitRow> {
  const { data, error } = await supabase.from("inventory_units").insert(payload).select().maybeSingle();
  handleError(error);
  if (!data) throw new Error("Failed to create inventory unit");
  return data as InventoryUnitRow;
}

/**
 * Create an inventory unit using the service role (bypasses RLS). Useful for admin tasks.
 */
export async function createInventoryUnitAdmin(payload: NewInventoryUnit): Promise<InventoryUnitRow> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin.from("inventory_units").insert(payload).select().maybeSingle();
  handleError(error);
  if (!data) throw new Error("Failed to create inventory unit (admin)");
  return data as InventoryUnitRow;
}

export async function getInventoryUnit(
  supabase: SupabaseClient,
  id: string,
): Promise<InventoryUnitRow | null> {
  const { data, error } = await supabase.from("inventory_units").select("*").eq("id", id).maybeSingle();
  handleError(error);
  return (data as InventoryUnitRow) ?? null;
}

export async function listInventoryUnits(
  supabase: SupabaseClient,
  kitchenId: string,
  opts?: { limit?: number; offset?: number; order?: { column: string; ascending?: boolean } },
): Promise<InventoryUnitRow[]> {
  let query = supabase.from("inventory_units").select("*").eq("kitchen_id", kitchenId);
  if (opts?.order) query = query.order(opts.order.column, { ascending: opts.order.ascending ?? true });
  if (opts?.limit) query = query.limit(opts.limit);
  if (opts?.offset) query = query.range(opts.offset, (opts.offset ?? 0) + (opts.limit ?? 100) - 1);
  const { data, error } = await query;
  handleError(error);
  return (data as InventoryUnitRow[]) ?? [];
}

export async function updateInventoryUnit(
  supabase: SupabaseClient,
  payload: UpdateInventoryUnit,
): Promise<InventoryUnitRow> {
  const { id, ...rest } = payload;
  const { data, error } = await supabase.from("inventory_units").update(rest).eq("id", id).select().maybeSingle();
  handleError(error);
  if (!data) throw new Error("Failed to update inventory unit");
  return data as InventoryUnitRow;
}

export async function deleteInventoryUnit(
  supabase: SupabaseClient,
  id: string,
): Promise<boolean> {
  const { error } = await supabase.from("inventory_units").delete().eq("id", id);
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
): Promise<InventoryUnitRow> {
  const { data, error } = await supabase.from("inventory_units").update({ quantity }).eq("id", id).select().maybeSingle();
  handleError(error);
  if (!data) throw new Error("Failed to reconcile inventory unit");
  return data as InventoryUnitRow;
}
