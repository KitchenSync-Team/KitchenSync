-- Remove duplicate indexes on kitchen_members
DROP INDEX IF EXISTS public.ix_members_kitchen;
DROP INDEX IF EXISTS public.ix_members_user;
DROP INDEX IF EXISTS public.uq_kitchen_members_unique;

-- Enable RLS on cache/catalog tables (server-only access via service role)
ALTER TABLE public.recipe_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_saved_recipes ENABLE ROW LEVEL SECURITY;

-- Units: allow read-only for authenticated users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'units'
      AND policyname = 'units_read_authenticated'
  ) THEN
    CREATE POLICY units_read_authenticated
      ON public.units
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Fix function search_path warnings
CREATE OR REPLACE FUNCTION public.flag_soon_expiring_inventory()
RETURNS void
LANGUAGE sql
SET search_path TO 'public'
AS $$
  INSERT INTO public.alerts (
    kitchen_id,
    inventory_unit_id,
    type,
    alert_date
  )
  SELECT
    inv.kitchen_id,
    inv.id AS inventory_unit_id,
    'expiring_soon'::text AS type,
    inv.expires_at AS alert_date
  FROM public.inventory AS inv
  WHERE
    inv.expires_at IS NOT NULL
    AND inv.expires_at > current_date
    AND inv.expires_at <= current_date + 3
    AND NOT EXISTS (
      SELECT 1
      FROM public.alerts a
      WHERE
        a.inventory_unit_id = inv.id
        AND a.type = 'expiring_soon'
        AND a.alert_date = inv.expires_at
    );
$$;

CREATE OR REPLACE FUNCTION public.flag_expired_inventory()
RETURNS void
LANGUAGE sql
SET search_path TO 'public'
AS $$
  INSERT INTO public.alerts (
    kitchen_id,
    inventory_unit_id,
    type,
    alert_date
  )
  SELECT
    inv.kitchen_id,
    inv.id AS inventory_unit_id,
    'expired'::text AS type,
    inv.expires_at AS alert_date
  FROM public.inventory AS inv
  WHERE
    inv.expires_at IS NOT NULL
    AND inv.expires_at <= current_date
    AND NOT EXISTS (
      SELECT 1
      FROM public.alerts a
      WHERE
        a.inventory_unit_id = inv.id
        AND a.type = 'expired'
        AND a.alert_date = inv.expires_at
    );
$$;

CREATE OR REPLACE FUNCTION public.flag_inventory_alerts()
RETURNS void
LANGUAGE sql
SET search_path TO 'public'
AS $$
  SELECT public.flag_soon_expiring_inventory();
  SELECT public.flag_expired_inventory();
$$;

CREATE OR REPLACE FUNCTION public.touch_profiles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
begin
  new.updated_at := now();
  return new;
end;
$$;
;
