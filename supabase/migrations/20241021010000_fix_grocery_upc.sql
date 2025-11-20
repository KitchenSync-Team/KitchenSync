-- Ensure grocery_products has a UPC column before creating the index.
ALTER TABLE public.grocery_products
  ADD COLUMN IF NOT EXISTS upc text;

CREATE UNIQUE INDEX IF NOT EXISTS grocery_products_upc_key
  ON public.grocery_products (upc)
  WHERE upc IS NOT NULL;
