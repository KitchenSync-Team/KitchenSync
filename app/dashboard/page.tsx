
'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import AddItemModal from '@/components/AddItemModal';
import { formatInventoryExpiry, formatInventoryItemName } from '@/lib/formatting/inventory';

type Item = {
  id: string;
  name: string;
  quantity: number;
  expires_at: string | null;
  locationId: string | number | null;
  locationName: string | null;
};

export default function DashboardPage() {
  const supabase = createClient();

  const [kitchenId, setKitchenId] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [units, setUnits] = useState<{ id: string | number; name: string }[]>([]);
  const [locations, setLocations] = useState<{ id: string | number; name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

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
      supabase.from('units').select('id,name').order('name'),
      supabase.from('locations').select('id,name').order('name'),
    ]);
    setUnits(u ?? []);
    setLocations(l ?? []);
  }, [supabase]);

  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  const getLocationCategory = (locationName: string | null | undefined, locationId: string | number | null) => {
    const name = (locationName ?? '').trim().toLowerCase();
    if (name.includes('freezer')) return 'freezer';
    if (name.includes('freeze') || name.includes('frozen') || name.includes('fridge')) return 'freeze';
    if (name.includes('pantry')) return 'pantry';

    const location = locationId ? locations.find((loc) => String(loc.id) === String(locationId)) : undefined;
    const fallbackName = (location?.name ?? '').trim().toLowerCase();
    if (fallbackName.includes('freezer')) return 'freezer';
    if (fallbackName.includes('freeze') || fallbackName.includes('frozen') || fallbackName.includes('fridge')) return 'freeze';
    if (fallbackName.includes('pantry')) return 'pantry';

    return 'other';
  };

  const loadItems = useCallback(async (kId: string) => {
    const locationLookup = new Map<string, string>(
      locations.map((loc) => [String(loc.id), loc.name]),
    );

    const { data } = await supabase
      .from('inventory')
      .select('id,quantity,expires_at,location_id,items(name),locations(id,name)')
      .eq('kitchen_id', kId)
      .order('expires_at', { ascending: true, nullsFirst: true });

    const mapped = Array.isArray(data)
      ? data.map((row) => {
          const item = Array.isArray(row.items) ? row.items[0] ?? row.items : row.items;

          const locationRow = Array.isArray(row.locations) ? row.locations[0] ?? row.locations : row.locations;
          const locationId = locationRow?.id ?? row.location_id ?? null;
          const locationName =
            locationRow?.name ??
            (locationId ? locationLookup.get(String(locationId)) ?? null : null);

          return {
            id: row.id,
            name: formatInventoryItemName(item?.name ?? 'Item'),
            quantity: Number(row.quantity ?? 0),
            expires_at: row.expires_at ?? null,
            locationId,
            locationName,
          };
        })
      : [];

    setItems(mapped);
  }, [supabase, locations]);

  const handleDeleteItem = async (itemId: string) => {
    if (!kitchenId) return;

    const confirmDelete = window.confirm('Are you sure you want to delete this inventory item?');
    if (!confirmDelete) return;

    setDeletingItemId(itemId);
    try {
      const { error } = await supabase.from('inventory').delete().eq('id', itemId).eq('kitchen_id', kitchenId);
      if (error) {
        alert('Delete failed: ' + error.message);
      } else {
        // refresh after delete
        await loadItems(kitchenId);
      }
    } finally {
      setDeletingItemId(null);
    }
  };


  useEffect(() => {
    resolveKitchen();
    loadRefs();
  }, [resolveKitchen, loadRefs]);

  useEffect(() => {
    if (kitchenId && locations.length > 0) {
      loadItems(kitchenId);
    }
  }, [kitchenId, locations, loadItems]);

  const getDaysToExpiry = (expiration: string | null) => {
    if (!expiration) return null;
    const due = new Date(expiration);
    const now = new Date();
    const diffMs = due.getTime() - now.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  const expiredItems = items.filter((item) => {
    const days = getDaysToExpiry(item.expires_at);
    return typeof days === 'number' ? days < 0 : false;
  });

  const expiringSoonItems = items
    .map((item) => ({ ...item, daysLeft: getDaysToExpiry(item.expires_at) }))
    .filter((item) => item.daysLeft !== null && item.daysLeft >= 0 && item.daysLeft <= 7)
    .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));

  const normalizeLocation = (name: string | null | undefined) => (name ?? '').trim().toLowerCase();

  const freezerItems = items.filter((item) => {
    const normalized = normalizeLocation(item.locationName);
    return normalized.includes('freezer');
  });

  const freezeItems = items.filter((item) => {
    const normalized = normalizeLocation(item.locationName);
    return normalized.includes('freeze') || normalized.includes('frozen') || normalized.includes('fridge');
  });

  const pantryItems = items.filter((item) => normalizeLocation(item.locationName).includes('pantry'));

  const getItemQuantity = (entries: Item[]) => entries.reduce((sum, entry) => sum + entry.quantity, 0);

  const locationCategory = (item: Item) => {
    const normalized = normalizeLocation(item.locationName ?? null);
    if (normalized.includes('freezer')) return 'freezer';
    if (normalized.includes('freeze') || normalized.includes('frozen') || normalized.includes('fridge')) return 'freeze';
    if (normalized.includes('pantry')) return 'pantry';

    const location = item.locationId ? locations.find((loc) => String(loc.id) === String(item.locationId)) : undefined;
    const name = normalizeLocation(location?.name ?? null);
    if (name.includes('freezer')) return 'freezer';
    if (name.includes('freeze') || name.includes('frozen') || name.includes('fridge')) return 'freeze';
    if (name.includes('pantry')) return 'pantry';

    return 'other';
  };

  const counts = items.reduce(
    (acc, item) => {
      const category = locationCategory(item);
      const days = getDaysToExpiry(item.expires_at);
      const isExpired = typeof days === 'number' && days < 0;

      if (category === 'freezer') {
        acc.freezerCount += 1;
        acc.freezerQuantity += item.quantity;
      }
      if (category === 'freeze') {
        acc.freezeCount += 1;
        acc.freezeQuantity += item.quantity;
      }
      if (category === 'pantry') {
        acc.pantryCount += 1;
        acc.pantryQuantity += item.quantity;
      }
      if (isExpired) {
        acc.expiredCount += 1;
        acc.expiredQuantity += item.quantity;
      }

      return acc;
    },
    {
      freezerCount: 0,
      freezerQuantity: 0,
      freezeCount: 0,
      freezeQuantity: 0,
      pantryCount: 0,
      pantryQuantity: 0,
      expiredCount: 0,
      expiredQuantity: 0,
    },
  );

  const cardData = [
    { label: 'Freezer', count: counts.freezerCount, quantity: counts.freezerQuantity, color: 'bg-cyan-500' },
    { label: 'Freeze', count: counts.freezeCount, quantity: counts.freezeQuantity, color: 'bg-blue-500' },
    { label: 'Pantry', count: counts.pantryCount, quantity: counts.pantryQuantity, color: 'bg-amber-500' },
    { label: 'Expired', count: counts.expiredCount, quantity: counts.expiredQuantity, color: 'bg-rose-500' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Inventory Dashboard</h1>
        {scanMessage && <div className="text-sm text-blue-600">{scanMessage}</div>}
      </div>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cardData.map((card) => (
          <div key={card.label} className="rounded-xl border p-4 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm text-gray-500">{card.label}</div>
                <div className="text-2xl font-semibold">{card.count}</div>
                <div className="text-xs text-gray-500">Units: {card.quantity}</div>
              </div>
              <span className={`${card.color} h-10 w-10 rounded-full`} />
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-xl border p-4">
        <h2 className="mb-3 text-lg font-semibold">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            onClick={() => setOpen(true)}
            className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-left text-sm font-medium shadow-sm transition hover:bg-gray-50"
          >
            + Add item
            <div className="text-xs text-gray-500">Add item in Freezer/Freeze/Pantry</div>
          </button>

          <button
            onClick={() => {
              setScanMessage('Scan Item from receipt is coming soon.');
              setTimeout(() => setScanMessage(null), 4500);
            }}
            className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-left text-sm font-medium shadow-sm transition hover:bg-gray-50"
          >
            📷 Scan item from receipt
            <div className="text-xs text-gray-500">Smart scan and add multiple items</div>
          </button>
        </div>
      </section>

      <section className="rounded-xl border p-4">
        <h2 className="mb-3 text-lg font-semibold">Expiring Soon</h2>
        {expiringSoonItems.length > 0 ? (
          <ul className="space-y-2">
            {expiringSoonItems.map((item) => (
              <li key={item.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs text-gray-500">
                    {item.locationName || 'Unknown location'} · Qty: {item.quantity}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  disabled={deletingItemId === item.id}
                  className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                >
                  {deletingItemId === item.id ? 'Deleting...' : 'Delete'}
                </button>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${
                    item.daysLeft === 0
                      ? 'bg-rose-100 text-rose-700'
                      : item.daysLeft !== null && item.daysLeft <= 2
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-sky-100 text-sky-700'
                  }`}
                >
                  {item.daysLeft === 0 ? 'Today' : `${item.daysLeft} day${item.daysLeft === 1 ? '' : 's'}`}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-sm text-gray-500">No expiring items in the next 7 days.</div>
        )}
      </section>

      <section className="rounded-xl border p-4">
        <h2 className="mb-3 text-lg font-semibold">Inventory Items</h2>
        <ul className="divide-y rounded-xl border">
          {items.map((it) => (
            <li key={it.id} className="flex items-center justify-between p-3">
              <div>
                <div className="font-medium">{it.name}</div>
                <div className="text-sm text-gray-600">
                  Qty: {it.quantity} · Location: {it.locationName ?? 'Unknown'} · Expires: {formatInventoryExpiry(it.expires_at)}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-xs font-semibold text-gray-700">
                  {(() => {
                    const daysLeft = getDaysToExpiry(it.expires_at);
                    if (daysLeft === null) return 'No date';
                    if (daysLeft < 0) return `${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? '' : 's'} ago`;
                    return `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`;
                  })()}
                </div>
                <button
                  onClick={() => handleDeleteItem(it.id)}
                  disabled={deletingItemId === it.id}
                  className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                >
                  {deletingItemId === it.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </li>
          ))}
          {items.length === 0 && <li className="p-4 text-sm text-gray-500">No items yet.</li>}
        </ul>
      </section>

      <AddItemModal
        open={open}
        onCloseAction={() => setOpen(false)}
        kitchenId={kitchenId ?? ''}     // safe because button disables until ready
        units={units}
        locations={locations}
        onCreatedAction={() => kitchenId && loadItems(kitchenId)}
      />
    </div>
  );
}
