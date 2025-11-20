-- Catalog tables for Spoonacular-backed data with simple names.

-- Ingredients catalog: whole foods/ingredients detail
CREATE TABLE IF NOT EXISTS public.ingredients_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spoonacular_id bigint NOT NULL,
  name text NOT NULL,
  brand text,
  aisle text,
  category text,
  image_url text,
  possible_units text[],
  badges jsonb,
  nutrition jsonb,
  raw jsonb,
  last_synced_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ingredients_catalog_spoonacular_id_key
  ON public.ingredients_catalog (spoonacular_id);

-- Grocery products catalog: packaged goods
CREATE TABLE IF NOT EXISTS public.grocery_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spoonacular_id bigint NOT NULL,
  title text NOT NULL,
  upc text,
  brand text,
  category text,
  image_url text,
  badges jsonb,
  nutrition jsonb,
  raw jsonb,
  last_synced_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS grocery_products_spoonacular_id_key
  ON public.grocery_products (spoonacular_id);

CREATE UNIQUE INDEX IF NOT EXISTS grocery_products_upc_key
  ON public.grocery_products (upc)
  WHERE upc IS NOT NULL;

-- Recipes catalog: detailed recipe payloads
CREATE TABLE IF NOT EXISTS public.recipes_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spoonacular_id bigint NOT NULL,
  title text NOT NULL,
  image_url text,
  source_url text,
  summary text,
  diets text[],
  cuisines text[],
  ready_in_minutes integer,
  servings integer,
  nutrition jsonb,
  ingredients jsonb,
  raw jsonb,
  last_synced_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS recipes_catalog_spoonacular_id_key
  ON public.recipes_catalog (spoonacular_id);

-- Link cached catalog entries to items for display/offline use
ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS ingredient_catalog_id uuid REFERENCES public.ingredients_catalog(id),
  ADD COLUMN IF NOT EXISTS grocery_product_id uuid REFERENCES public.grocery_products(id),
  ADD COLUMN IF NOT EXISTS spoonacular_ingredient_id bigint,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS aisle text;

-- Prevent duplicate spoonacular ingredients per kitchen
CREATE UNIQUE INDEX IF NOT EXISTS items_kitchen_spoonacular_ing_unique
  ON public.items (kitchen_id, spoonacular_ingredient_id)
  WHERE spoonacular_ingredient_id IS NOT NULL;

-- Saved recipes link to recipes catalog
ALTER TABLE public.user_saved_recipes
  ADD COLUMN IF NOT EXISTS recipes_catalog_id uuid REFERENCES public.recipes_catalog(id),
  ADD COLUMN IF NOT EXISTS spoonacular_recipe_id bigint;

CREATE UNIQUE INDEX IF NOT EXISTS user_saved_recipes_spoonacular_unique
  ON public.user_saved_recipes (user_id, spoonacular_recipe_id)
  WHERE spoonacular_recipe_id IS NOT NULL;
