'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/client';
import AddItemModal from '@/components/AddItemModal';

type Item = { id: string; name: string; quantity: number; expiration_date: string | null };

export default function DashboardPage() {
  const supabase = createClient();

  const [kitchenId, setKitchenId] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [units, setUnits] = useState<{ id: string | number; name: string }[]>([]);
  const [locations, setLocations] = useState<{ id: string | number; name: string }[]>([]);
  const [open, setOpen] = useState(false);

  // 1) Resolve active kitchen from profile
  const resolveKitchen = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('default_kitchen_id')
      .eq('id', uid)
      .single();

    if (profile?.default_kitchen_id) setKitchenId(profile.default_kitchen_id);
  }, [supabase]);

  // 2) Load reference data + items
  const loadRefs = useCallback(async () => {
    const [{ data: u }, { data: l }] = await Promise.all([
      supabase.from('inventory_units').select('id,name').order('name'),
      supabase.from('locations').select('id,name').order('name'),
    ]);
    setUnits(u ?? []);
    setLocations(l ?? []);
  }, [supabase]);

  const loadItems = useCallback(async (kId: string) => {
    const { data } = await supabase
      .from('items')
      .select('id,name,quantity,expiration_date')
      .eq('kitchen_id', kId)
      .order('expiration_date', { ascending: true, nullsFirst: true });
    setItems(data ?? []);
  }, [supabase]);

  useEffect(() => {
    resolveKitchen();
    loadRefs();
  }, [resolveKitchen, loadRefs]);

  useEffect(() => {
    if (kitchenId) loadItems(kitchenId);
  }, [kitchenId, loadItems]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Inventory</h1>
        <button
          onClick={() => setOpen(true)}
          className="rounded-xl bg-black px-4 py-2 text-white"
          disabled={!kitchenId}
        >
          + Add Item
        </button>
      </div>

      <ul className="divide-y rounded-xl border">
        {items.map(it => (
          <li key={it.id} className="flex items-center justify-between p-3">
            <div>
              <div className="font-medium">{it.name}</div>
              <div className="text-sm text-gray-600">
                Qty: {it.quantity} • Exp: {it.expiration_date ?? '—'}
              </div>
            </div>
          </li>
        ))}
        {items.length === 0 && <li className="p-4 text-sm text-gray-500">No items yet.</li>}
      </ul>

      <AddItemModal
        open={open}
        onClose={() => setOpen(false)}
        kitchenId={kitchenId ?? ''}     // safe because button disables until ready
        units={units}
        locations={locations}
        onCreated={() => kitchenId && loadItems(kitchenId)}
      />
    </div>
  );
}
