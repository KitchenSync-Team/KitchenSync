"use client";

import React, { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Option = { id: string | number; name: string };

type Props = {
  open: boolean;
  onClose: () => void;
  kitchenId: string;
  units: Option[];
  locations: Option[];
  onCreated?: () => void;
};

export default function AddItemModal({ open, onClose, kitchenId, units, locations, onCreated }: Props) {
  const supabase = createClient();

  const [form, setForm] = useState({
    name: "",
    quantity: 1,
    unit_id: "" as string | number | "",
    location_id: "" as string | number | "",
    expiration_date: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!open) return null;

  const update = (k: keyof typeof form, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const payload = {
        kitchen_id: kitchenId,
        name: form.name.trim(),
        quantity: Number(form.quantity) || 0,
        unit_id: form.unit_id || null,
        location_id: form.location_id || null,
        expiration_date: form.expiration_date || null,
        notes: form.notes || null,
      };
      const { error } = await supabase.from("items").insert(payload);
      if (error) throw error;

      onCreated?.();
      onClose();
      setForm({ name: "", quantity: 1, unit_id: "", location_id: "", expiration_date: "", notes: "" });
    } catch (e: any) {
      setErr(e.message ?? "Failed to add item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Add Item</h2>
          <button onClick={onClose} className="rounded px-2 py-1">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-3">
          <label className="grid gap-1">
            <span className="text-sm">Name</span>
            <input required className="rounded border p-2" placeholder="Milk" value={form.name} onChange={(e) => update("name", e.target.value)} />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1">
              <span className="text-sm">Quantity</span>
              <input className="rounded border p-2" type="number" min={0} value={String(form.quantity)} onChange={(e) => update("quantity", Number(e.target.value))} />
            </label>

            <label className="grid gap-1">
              <span className="text-sm">Unit</span>
              <select className="rounded border p-2" value={String(form.unit_id)} onChange={(e) => update("unit_id", e.target.value)}>
                <option value="">—</option>
                {units.map((u) => (
                  <option key={String(u.id)} value={String(u.id)}>
                    {u.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="grid gap-1">
            <span className="text-sm">Location</span>
            <select className="rounded border p-2" value={String(form.location_id)} onChange={(e) => update("location_id", e.target.value)}>
              <option value="">—</option>
              {locations.map((l) => (
                <option key={String(l.id)} value={String(l.id)}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-sm">Expiration date</span>
            <input className="rounded border p-2" type="date" value={form.expiration_date} onChange={(e) => update("expiration_date", e.target.value)} />
          </label>

          <label className="grid gap-1">
            <span className="text-sm">Notes</span>
            <textarea className="rounded border p-2" rows={3} placeholder="Brand, size, etc." value={form.notes} onChange={(e) => update("notes", e.target.value)} />
          </label>

          {err && <p className="text-sm text-red-600">{err}</p>}

          <button className="mt-2 rounded-xl border bg-black px-4 py-2 text-white disabled:opacity-60" type="submit" disabled={loading}>
            {loading ? "Adding…" : "Add Item"}
          </button>
        </form>
      </div>
    </div>
  );
}
