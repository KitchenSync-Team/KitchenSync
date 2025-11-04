export default function InventoryPage() {
  return (
    <section className="flex flex-1 flex-col gap-4 rounded-lg border border-dashed p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
      <p className="max-w-2xl text-sm text-muted-foreground">
        This page will show a full inventory breakdown, grouped by storage location, with controls to add,
        edit, and reconcile items manually or via barcode/receipt import.
      </p>
    </section>
  );
}
