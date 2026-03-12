"use client";

import { useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { differenceInCalendarDays, parseISO } from "date-fns";

import { createClient } from "@/lib/supabase/client";
import { formatInventoryItemName, formatQuantityWithUnit } from "@/lib/formatting/inventory";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ExpiredItem = {
  id: string;
  name: string;
  brand: string | null;
  quantity: number;
  uom: string;
  expiresAt: string | null;
  location: string | null;
};

function expiryLabel(expiresAt: string | null): string {
  if (!expiresAt) return "No date";
  const days = differenceInCalendarDays(parseISO(expiresAt), new Date());
  if (days >= 0) return "Expires today";
  const abs = Math.abs(days);
  return `Expired ${abs} ${abs === 1 ? "day" : "days"} ago`;
}

function ExpiredItemRow({
  item,
  onDelete,
}: {
  item: ExpiredItem;
  onDelete: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <li
      className="space-y-1.5"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {formatInventoryItemName(item.name)}
          </p>
          <p className="text-xs text-muted-foreground">
            {item.location ?? "No location"} · {formatQuantityWithUnit(item.quantity, item.uom)}
          </p>
        </div>
        <button
          onClick={() => onDelete(item.id)}
          className={`shrink-0 inline-flex items-center gap-1.5 rounded-md px-2.5 py-0.5 text-xs font-semibold transition-all pointer-events-auto ${
            hovered
              ? "bg-destructive text-destructive-foreground"
              : "border-transparent bg-destructive text-destructive-foreground"
          }`}
        >
          {hovered ? (
            <>
              <Trash2 className="size-3" />
              Delete
            </>
          ) : (
            expiryLabel(item.expiresAt)
          )}
        </button>
      </div>
      <div
        className="relative h-1.5 w-full overflow-hidden rounded-full"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(128,128,128,0.15) 3px, rgba(128,128,128,0.15) 6px)",
        }}
      >
        <div className="relative h-full w-full rounded-full bg-destructive" />
      </div>
    </li>
  );
}

export function ExpiredItemsPanel({ initialItems }: { initialItems: ExpiredItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const supabase = createClient();

  const itemToDelete = items.find((i) => i.id === confirmId);

  async function handleDelete(id: string) {
    setDeleting(true);
    await supabase.from("inventory").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    setConfirmId(null);
    setDeleting(false);
  }

  async function handleClearAll() {
    setDeleting(true);
    const ids = items.map((i) => i.id);
    await supabase.from("inventory").delete().in("id", ids);
    setItems([]);
    setConfirmClearAll(false);
    setDeleting(false);
  }

  if (items.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        No expired items 🎉
      </p>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScrollArea className="flex-1 min-h-0 pr-3">
        <ul className="space-y-4">
          {items.map((item) => (
            <ExpiredItemRow
              key={item.id}
              item={item}
              onDelete={(id) => setConfirmId(id)}
            />
          ))}
        </ul>
      </ScrollArea>

      {/* Single item confirm */}
      <AlertDialog open={!!confirmId} onOpenChange={(open) => !open && setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove expired item?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove{" "}
              <span className="font-medium text-foreground">
                {itemToDelete ? formatInventoryItemName(itemToDelete.name) : "this item"}
              </span>{" "}
              from your inventory. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={() => confirmId && handleDelete(confirmId)}
            >
              {deleting ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear all confirm */}
      <AlertDialog open={confirmClearAll} onOpenChange={setConfirmClearAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all expired items?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove all{" "}
              <span className="font-medium text-foreground">{items.length} expired item{items.length !== 1 ? "s" : ""}</span>{" "}
              from your inventory. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={handleClearAll}
            >
              {deleting ? "Clearing…" : `Clear all ${items.length} item${items.length !== 1 ? "s" : ""}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex shrink-0 items-center justify-between pt-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/protected/inventory">Manage inventory →</Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setConfirmClearAll(true)}
        >
          <Trash2 className="mr-1.5 size-3.5" />
          Clear all
        </Button>
      </div>
    </div>
  );
}
