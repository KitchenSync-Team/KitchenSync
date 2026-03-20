-- ============================================================
-- KitchenSync Database Bootstrap
-- ============================================================
-- PURPOSE:
--   Initialise a fresh local/dev PostgreSQL database with the
--   full KitchenSync schema: tables, indexes, functions,
--   triggers, RLS enable, and RLS policies.
--
-- USAGE:
--   1. Start a local PostgreSQL instance (e.g. via Docker).
--   2. Run auth_stub.sql first to create the fake auth schema:
--        psql ... -f scripts/db/auth_stub.sql
--   3. Run this file:
--        psql ... -f scripts/db/bootstrap.sql
--
-- NOTES:
--   - For local RLS testing, simulate auth.uid() by setting:
--       SET app.current_user_id = '<your-uuid>';
--   - Auth triggers (on_auth_user_created, on_auth_user_updated)
--     fire on auth.users inserts/updates. Insert a row into
--     auth.users first; handle_new_user() will auto-create the
--     profile and default kitchen.
--   - DO NOT run this against production.
-- ============================================================


-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";


-- ============================================================
-- TABLES  (ordered by foreign-key dependency)
-- ============================================================

-- 1. units
CREATE TABLE public.units (
  id           uuid NOT NULL DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  abbreviation text,
  type         text NOT NULL,
  CONSTRAINT units_pkey PRIMARY KEY (id),
  CONSTRAINT units_name_key UNIQUE (name),
  CONSTRAINT units_abbreviation_key UNIQUE (abbreviation)
);

-- 2. ingredients_catalog
CREATE TABLE public.ingredients_catalog (
  id                uuid   NOT NULL DEFAULT gen_random_uuid(),
  spoonacular_id    bigint NOT NULL,
  name              text   NOT NULL,
  brand             text,
  aisle             text,
  category          text,
  image_url         text,
  possible_units    text[],
  badges            jsonb,
  nutrition         jsonb,
  raw               jsonb,
  last_synced_at    timestamp with time zone DEFAULT now(),
  CONSTRAINT ingredients_catalog_pkey PRIMARY KEY (id),
  CONSTRAINT ingredients_catalog_spoonacular_id_key UNIQUE (spoonacular_id)
);

-- 3. recipes_catalog
CREATE TABLE public.recipes_catalog (
  id               uuid   NOT NULL DEFAULT gen_random_uuid(),
  spoonacular_id   bigint NOT NULL,
  title            text   NOT NULL,
  image_url        text,
  source_url       text,
  summary          text,
  diets            text[],
  cuisines         text[],
  ready_in_minutes integer,
  servings         integer,
  nutrition        jsonb,
  ingredients      jsonb,
  raw              jsonb,
  last_synced_at   timestamp with time zone DEFAULT now(),
  CONSTRAINT recipes_catalog_pkey PRIMARY KEY (id),
  CONSTRAINT recipes_catalog_spoonacular_id_key UNIQUE (spoonacular_id)
);

-- 4. recipe_cache
CREATE TABLE public.recipe_cache (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  cache_key  text NOT NULL,
  results    jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  CONSTRAINT recipe_cache_pkey PRIMARY KEY (id)
);

-- 5. profiles (references auth.users)
CREATE TABLE public.profiles (
  id                  uuid NOT NULL,
  full_name           text,
  avatar_url          text,
  created_at          timestamp with time zone DEFAULT now(),
  email               text,
  updated_at          timestamp with time zone NOT NULL DEFAULT now(),
  username            text,
  onboarding_complete boolean DEFAULT false,
  first_name          text,
  last_name           text,
  sex                 text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_username_key UNIQUE (username),
  CONSTRAINT profiles_sex_check CHECK (
    sex = ANY (ARRAY['female','male','non_binary','other','prefer_not_to_say'])
  ),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id)
    REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 6. kitchens (references auth.users)
CREATE TABLE public.kitchens (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  owner_id   uuid REFERENCES auth.users(id),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  icon_key   text NOT NULL DEFAULT 'chef-hat',
  CONSTRAINT kitchens_pkey PRIMARY KEY (id)
);

-- 7. kitchen_members (references kitchens, auth.users)
CREATE TABLE public.kitchen_members (
  kitchen_id  uuid NOT NULL REFERENCES public.kitchens(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'member'
                CHECK (role = ANY (ARRAY['owner','member'])),
  joined_at   timestamp with time zone DEFAULT now(),
  invited_by  uuid REFERENCES auth.users(id),
  invited_at  timestamp with time zone,
  accepted_at timestamp with time zone,
  created_by  uuid REFERENCES auth.users(id),
  CONSTRAINT kitchen_members_pkey PRIMARY KEY (kitchen_id, user_id)
);

-- 8. kitchen_invitations (references kitchens, auth.users)
CREATE TABLE public.kitchen_invitations (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  kitchen_id  uuid NOT NULL REFERENCES public.kitchens(id) ON DELETE CASCADE,
  email       text NOT NULL,
  invited_by  uuid NOT NULL REFERENCES auth.users(id),
  role        text NOT NULL DEFAULT 'member'
                CHECK (role = ANY (ARRAY['owner','member'])),
  token       uuid NOT NULL DEFAULT gen_random_uuid(),
  expires_at  timestamp with time zone NOT NULL DEFAULT (now() + '7 days'::interval),
  accepted_by uuid REFERENCES auth.users(id),
  accepted_at timestamp with time zone,
  created_at  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT kitchen_invitations_pkey PRIMARY KEY (id)
);

-- 9. locations (references kitchens)
CREATE TABLE public.locations (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  kitchen_id uuid NOT NULL REFERENCES public.kitchens(id) ON DELETE CASCADE,
  name       text NOT NULL,
  sort_order integer DEFAULT 0,
  is_default boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  icon       text,
  CONSTRAINT locations_pkey PRIMARY KEY (id),
  CONSTRAINT uq_locations_household_name UNIQUE (kitchen_id, name)
);

-- 10. items (references kitchens, ingredients_catalog)
CREATE TABLE public.items (
  id                        uuid NOT NULL DEFAULT gen_random_uuid(),
  kitchen_id                uuid NOT NULL REFERENCES public.kitchens(id) ON DELETE CASCADE,
  name                      text NOT NULL,
  brand                     text,
  default_shelf_life_days   integer,
  barcode                   text,
  created_by                uuid REFERENCES auth.users(id),
  created_at                timestamp with time zone DEFAULT now(),
  category                  text,
  notes                     text,
  updated_at                timestamp with time zone NOT NULL DEFAULT now(),
  is_archived               boolean DEFAULT false,
  ingredient_catalog_id     uuid REFERENCES public.ingredients_catalog(id),
  spoonacular_ingredient_id bigint,
  image_url                 text,
  aisle                     text,
  CONSTRAINT items_pkey PRIMARY KEY (id)
);

-- 11. receipts (references kitchens, auth.users)
CREATE TABLE public.receipts (
  id              uuid NOT NULL DEFAULT gen_random_uuid(),
  kitchen_id      uuid NOT NULL REFERENCES public.kitchens(id) ON DELETE CASCADE,
  source          text,
  subtotal        numeric,
  tax             numeric,
  total           numeric,
  purchased_at    timestamp with time zone,
  raw_upload_path text,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamp with time zone DEFAULT now(),
  merchant_name   text,
  currency        text DEFAULT 'USD',
  updated_at      timestamp with time zone NOT NULL DEFAULT now(),
  external_id     text,
  CONSTRAINT receipts_pkey PRIMARY KEY (id)
);

-- 12. receipt_items (references receipts, items, units)
CREATE TABLE public.receipt_items (
  id                uuid    NOT NULL DEFAULT gen_random_uuid(),
  receipt_id        uuid    NOT NULL REFERENCES public.receipts(id) ON DELETE CASCADE,
  item_id           uuid    REFERENCES public.items(id),
  name              text    NOT NULL,
  brand             text,
  barcode           text,
  quantity          numeric DEFAULT 1,
  unit_price        numeric,
  line_total        numeric,
  parsed_confidence numeric,
  matched_item_id   uuid    REFERENCES public.items(id),
  unit_id           uuid    REFERENCES public.units(id),
  CONSTRAINT receipt_items_pkey PRIMARY KEY (id)
);

-- 13. inventory (references items, kitchens, locations, receipt_items, units)
CREATE TABLE public.inventory (
  id              uuid NOT NULL DEFAULT gen_random_uuid(),
  item_id         uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  kitchen_id      uuid NOT NULL REFERENCES public.kitchens(id) ON DELETE CASCADE,
  location_id     uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  quantity        numeric DEFAULT 1,
  purchased_at    date,
  opened_at       date,
  expires_at      date,
  notes           text,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamp with time zone DEFAULT now(),
  updated_at      timestamp with time zone DEFAULT now(),
  source          text,
  unit_price      numeric,
  line_total      numeric,
  receipt_item_id uuid REFERENCES public.receipt_items(id) ON DELETE SET NULL,
  unit_id         uuid REFERENCES public.units(id),
  CONSTRAINT inventory_units_pkey PRIMARY KEY (id)
);

-- 14. alerts (references kitchens, inventory)
CREATE TABLE public.alerts (
  id                uuid NOT NULL DEFAULT gen_random_uuid(),
  kitchen_id        uuid NOT NULL REFERENCES public.kitchens(id) ON DELETE CASCADE,
  inventory_unit_id uuid NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
  type              text NOT NULL CHECK (type = ANY (ARRAY['expiring_soon','expired'])),
  alert_date        date NOT NULL,
  acknowledged      boolean DEFAULT false,
  created_at        timestamp with time zone DEFAULT now(),
  created_by        uuid REFERENCES auth.users(id),
  CONSTRAINT alerts_pkey PRIMARY KEY (id)
);

-- 15. user_preferences (references auth.users, kitchens)
CREATE TABLE public.user_preferences (
  user_id                uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  default_kitchen_id     uuid REFERENCES public.kitchens(id) ON DELETE SET NULL,
  notification_prefs     jsonb,
  timezone               text DEFAULT 'America/New_York',
  locale                 text DEFAULT 'en-US',
  units_system           text DEFAULT 'imperial',
  email_opt_in           boolean DEFAULT true,
  push_opt_in            boolean DEFAULT false,
  dietary_preferences    text[] DEFAULT '{}',
  allergens              text[] DEFAULT '{}',
  personalization_opt_in boolean DEFAULT true,
  cuisine_likes          text[] DEFAULT '{}',
  cuisine_dislikes       text[] DEFAULT '{}',
  CONSTRAINT user_preferences_pkey PRIMARY KEY (user_id)
);

-- 16. user_saved_recipes (references auth.users, recipes_catalog)
CREATE TABLE public.user_saved_recipes (
  id                    uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id               uuid REFERENCES auth.users(id),
  recipe_id             text NOT NULL,
  title                 text NOT NULL,
  image_url             text,
  source_url            text,
  saved                 boolean DEFAULT true,
  cooked                boolean DEFAULT false,
  cooked_at             timestamp with time zone,
  created_at            timestamp with time zone DEFAULT now(),
  recipes_catalog_id    uuid REFERENCES public.recipes_catalog(id),
  spoonacular_recipe_id bigint,
  CONSTRAINT user_saved_recipes_pkey PRIMARY KEY (id),
  CONSTRAINT user_saved_recipes_user_id_recipe_id_key UNIQUE (user_id, recipe_id)
);


-- ============================================================
-- INDEXES
-- ============================================================

-- alerts
CREATE INDEX ix_alerts_kitchen      ON public.alerts (kitchen_id);
CREATE INDEX ix_alerts_iunit        ON public.alerts (inventory_unit_id);
CREATE INDEX ix_alerts_kitchen_date ON public.alerts (kitchen_id, alert_date);
CREATE INDEX ix_alerts_unacked      ON public.alerts (kitchen_id, alert_date)
  WHERE acknowledged = false;

-- inventory
CREATE INDEX ix_iunits_kitchen           ON public.inventory (kitchen_id);
CREATE INDEX ix_iunits_item              ON public.inventory (item_id);
CREATE INDEX ix_iunits_location          ON public.inventory (location_id);
CREATE INDEX ix_iunits_receipt_it        ON public.inventory (receipt_item_id);
CREATE INDEX ix_iunits_created_by        ON public.inventory (created_by);
CREATE INDEX ix_inventory_units_expires  ON public.inventory (kitchen_id, expires_at);
CREATE INDEX ix_inventory_units_location ON public.inventory (kitchen_id, location_id);

-- items
CREATE INDEX ix_items_kitchen         ON public.items (kitchen_id);
CREATE INDEX ix_items_created_by      ON public.items (created_by);
CREATE INDEX ix_items_kitchen_barcode ON public.items (kitchen_id, barcode);
CREATE INDEX ix_items_search
  ON public.items USING gin ((name || ' ' || COALESCE(brand, '')) gin_trgm_ops);
CREATE UNIQUE INDEX items_kitchen_spoonacular_ing_unique
  ON public.items (kitchen_id, spoonacular_ingredient_id)
  WHERE spoonacular_ingredient_id IS NOT NULL;

-- kitchen_invitations
CREATE INDEX ix_invites_kitchen          ON public.kitchen_invitations (kitchen_id);
CREATE INDEX ix_invites_expires_at       ON public.kitchen_invitations (expires_at);
CREATE INDEX ix_invites_email_expires    ON public.kitchen_invitations (email, expires_at);
CREATE INDEX ix_invites_email_unaccepted ON public.kitchen_invitations (email)
  WHERE accepted_at IS NULL;

-- kitchen_members
CREATE INDEX ix_kmembers_kitchen ON public.kitchen_members (kitchen_id);
CREATE INDEX ix_kmembers_user    ON public.kitchen_members (user_id);

-- locations
CREATE INDEX ix_locations_kitchen ON public.locations (kitchen_id);

-- receipt_items
CREATE INDEX ix_ritems_receipt ON public.receipt_items (receipt_id);
CREATE INDEX ix_ritems_item     ON public.receipt_items (item_id);
CREATE INDEX ix_ritems_matched  ON public.receipt_items (matched_item_id);

-- receipts
CREATE INDEX ix_receipts_kitchen    ON public.receipts (kitchen_id);
CREATE INDEX ix_receipts_created_by ON public.receipts (created_by);
CREATE INDEX ix_receipts_purchased  ON public.receipts (kitchen_id, purchased_at DESC);

-- recipe_cache
CREATE INDEX idx_recipe_cache_key ON public.recipe_cache (cache_key);

-- user_preferences
CREATE INDEX ix_uprefs_default_kitchen ON public.user_preferences (default_kitchen_id);

-- user_saved_recipes
CREATE INDEX idx_user_saved_recipes_user_id   ON public.user_saved_recipes (user_id);
CREATE INDEX idx_user_saved_recipes_recipe_id ON public.user_saved_recipes (recipe_id);
CREATE UNIQUE INDEX user_saved_recipes_spoonacular_unique
  ON public.user_saved_recipes (user_id, spoonacular_recipe_id)
  WHERE spoonacular_recipe_id IS NOT NULL;


-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Check if the current user is a member of a given kitchen
CREATE OR REPLACE FUNCTION public.auth_is_kitchen_member(p_kitchen_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.kitchen_members km
    WHERE km.kitchen_id = p_kitchen_id AND km.user_id = auth.uid()
  );
$$;

-- Shorthand membership check used in some RLS policies
CREATE OR REPLACE FUNCTION public.is_member_of(k uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.kitchen_members
    WHERE kitchen_id = k AND user_id = auth.uid()
  );
$$;

-- Upsert a profile from auth metadata
CREATE OR REPLACE FUNCTION public.sync_profile_from_auth_for_user(
  p_user_id  uuid,
  p_email    text,
  p_metadata jsonb
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_first_name text;
  v_last_name  text;
  v_full_name  text;
BEGIN
  v_first_name := nullif(trim(coalesce(p_metadata->>'first_name', '')), '');
  v_last_name  := nullif(trim(coalesce(p_metadata->>'last_name',  '')), '');
  v_full_name  := nullif(trim(coalesce(
    p_metadata->>'full_name',
    p_metadata->>'name',
    concat_ws(' ', v_first_name, v_last_name)
  )), '');

  INSERT INTO public.profiles (id, email, first_name, last_name, full_name, created_at, updated_at)
  VALUES (p_user_id, p_email, v_first_name, v_last_name, v_full_name, now(), now())
  ON CONFLICT (id) DO UPDATE SET
    email      = EXCLUDED.email,
    first_name = COALESCE(EXCLUDED.first_name, public.profiles.first_name),
    last_name  = COALESCE(EXCLUDED.last_name,  public.profiles.last_name),
    full_name  = COALESCE(EXCLUDED.full_name,  public.profiles.full_name),
    updated_at = now();
END;
$$;

-- Set a user's default kitchen if they don't already have one
CREATE OR REPLACE FUNCTION public.set_default_kitchen_if_missing(
  p_user_id    uuid,
  p_kitchen_id uuid
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  existing uuid;
BEGIN
  SELECT default_kitchen_id INTO existing
  FROM public.user_preferences WHERE user_id = p_user_id;

  IF existing IS NULL THEN
    UPDATE public.user_preferences
       SET default_kitchen_id = p_kitchen_id
     WHERE user_id = p_user_id;

    IF NOT FOUND THEN
      INSERT INTO public.user_preferences (user_id, default_kitchen_id)
      VALUES (p_user_id, p_kitchen_id);
    END IF;
  END IF;
END;
$$;

-- Create a default kitchen for a new user (called by handle_new_user trigger)
CREATE OR REPLACE FUNCTION public.create_default_kitchen_for_user(
  p_user_id   uuid,
  p_full_name text,
  p_email     text
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_existing_kitchen uuid;
  v_kitchen_id       uuid;
  v_name             text;
  v_first_name       text;
  v_email_prefix     text;
  v_base_label       text;
BEGIN
  -- If user already has a kitchen, just ensure default is set
  SELECT km.kitchen_id INTO v_existing_kitchen
  FROM public.kitchen_members km
  WHERE km.user_id = p_user_id
  ORDER BY km.joined_at NULLS FIRST
  LIMIT 1;

  IF v_existing_kitchen IS NOT NULL THEN
    PERFORM public.set_default_kitchen_if_missing(p_user_id, v_existing_kitchen);
    RETURN v_existing_kitchen;
  END IF;

  -- Build a friendly kitchen name from the user's name or email
  v_first_name   := nullif(trim(split_part(coalesce(p_full_name, ''), ' ', 1)), '');
  v_email_prefix := nullif(trim(split_part(coalesce(p_email, ''), '@', 1)), '');

  IF v_first_name IS NOT NULL THEN
    v_base_label := v_first_name;
  ELSIF v_email_prefix IS NOT NULL THEN
    v_base_label := initcap(v_email_prefix);
  END IF;

  IF v_base_label IS NOT NULL THEN
    IF lower(right(v_base_label, 1)) = 's' THEN
      v_name := v_base_label || ''' Kitchen';
    ELSE
      v_name := v_base_label || '''s Kitchen';
    END IF;
  END IF;

  IF v_name IS NULL THEN
    v_name := coalesce(nullif(trim(p_full_name), ''), v_email_prefix, 'My Kitchen');
  END IF;

  INSERT INTO public.kitchens (name, owner_id, created_by)
  VALUES (v_name, p_user_id, p_user_id)
  RETURNING id INTO v_kitchen_id;

  INSERT INTO public.kitchen_members (kitchen_id, user_id, role, created_by, accepted_at)
  VALUES (v_kitchen_id, p_user_id, 'owner', p_user_id, now())
  ON CONFLICT DO NOTHING;

  -- Seed default storage locations
  INSERT INTO public.locations (id, kitchen_id, name, sort_order, is_default)
  SELECT gen_random_uuid(), v_kitchen_id, loc.name, loc.ord, loc.def
  FROM (VALUES ('Pantry', 1, true), ('Fridge', 2, false), ('Freezer', 3, false)) AS loc(name, ord, def)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.locations
    WHERE kitchen_id = v_kitchen_id AND lower(name) = lower(loc.name)
  );

  INSERT INTO public.user_preferences (user_id, default_kitchen_id)
  VALUES (p_user_id, v_kitchen_id)
  ON CONFLICT (user_id) DO UPDATE SET default_kitchen_id = EXCLUDED.default_kitchen_id;

  PERFORM public.set_default_kitchen_if_missing(p_user_id, v_kitchen_id);

  RETURN v_kitchen_id;
END;
$$;

-- Cascade delete all data owned by a user (called before profile deletion)
CREATE OR REPLACE FUNCTION public.cascade_delete_user_data(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  kitchen_record record;
BEGIN
  DELETE FROM public.kitchen_invitations
  WHERE invited_by = p_user_id OR accepted_by = p_user_id;

  UPDATE public.alerts          SET created_by = null WHERE created_by = p_user_id;
  UPDATE public.inventory       SET created_by = null WHERE created_by = p_user_id;
  UPDATE public.items           SET created_by = null WHERE created_by = p_user_id;
  UPDATE public.kitchen_members SET invited_by = null, created_by = null
    WHERE invited_by = p_user_id OR created_by = p_user_id;
  UPDATE public.kitchens        SET created_by = null WHERE created_by = p_user_id;
  UPDATE public.receipts        SET created_by = null WHERE created_by = p_user_id;

  DELETE FROM public.kitchen_members WHERE user_id = p_user_id;

  FOR kitchen_record IN
    SELECT id FROM public.kitchens WHERE owner_id = p_user_id
  LOOP
    UPDATE public.user_preferences SET default_kitchen_id = null
    WHERE default_kitchen_id = kitchen_record.id AND user_id <> p_user_id;

    UPDATE public.receipt_items SET item_id = null
    WHERE item_id IN (SELECT id FROM public.items WHERE kitchen_id = kitchen_record.id);

    UPDATE public.receipt_items SET matched_item_id = null
    WHERE matched_item_id IN (SELECT id FROM public.items WHERE kitchen_id = kitchen_record.id);

    DELETE FROM public.alerts WHERE kitchen_id = kitchen_record.id;
    DELETE FROM public.inventory WHERE kitchen_id = kitchen_record.id;
    DELETE FROM public.items WHERE kitchen_id = kitchen_record.id;

    DELETE FROM public.receipt_items
    USING public.receipts r
    WHERE receipt_items.receipt_id = r.id AND r.kitchen_id = kitchen_record.id;

    DELETE FROM public.receipts WHERE kitchen_id = kitchen_record.id;
    DELETE FROM public.locations WHERE kitchen_id = kitchen_record.id;
    DELETE FROM public.kitchen_members WHERE kitchen_id = kitchen_record.id;
    DELETE FROM public.kitchen_invitations WHERE kitchen_id = kitchen_record.id;
    DELETE FROM public.kitchens WHERE id = kitchen_record.id;
  END LOOP;

  DELETE FROM public.user_preferences WHERE user_id = p_user_id;
END;
$$;

-- Flag inventory items expiring within 3 days
CREATE OR REPLACE FUNCTION public.flag_soon_expiring_inventory()
RETURNS void
LANGUAGE sql
SET search_path TO 'public'
AS $$
  INSERT INTO public.alerts (kitchen_id, inventory_unit_id, type, alert_date)
  SELECT inv.kitchen_id, inv.id, 'expiring_soon', inv.expires_at
  FROM public.inventory AS inv
  WHERE inv.expires_at IS NOT NULL
    AND inv.expires_at > current_date
    AND inv.expires_at <= current_date + 3
    AND NOT EXISTS (
      SELECT 1 FROM public.alerts a
      WHERE a.inventory_unit_id = inv.id
        AND a.type = 'expiring_soon'
        AND a.alert_date = inv.expires_at
    );
$$;

-- Flag inventory items that have already expired
CREATE OR REPLACE FUNCTION public.flag_expired_inventory()
RETURNS void
LANGUAGE sql
SET search_path TO 'public'
AS $$
  INSERT INTO public.alerts (kitchen_id, inventory_unit_id, type, alert_date)
  SELECT inv.kitchen_id, inv.id, 'expired', inv.expires_at
  FROM public.inventory AS inv
  WHERE inv.expires_at IS NOT NULL
    AND inv.expires_at <= current_date
    AND NOT EXISTS (
      SELECT 1 FROM public.alerts a
      WHERE a.inventory_unit_id = inv.id
        AND a.type = 'expired'
        AND a.alert_date = inv.expires_at
    );
$$;

-- Convenience wrapper to run both alert functions
CREATE OR REPLACE FUNCTION public.flag_inventory_alerts()
RETURNS void
LANGUAGE sql
SET search_path TO 'public'
AS $$
  SELECT public.flag_soon_expiring_inventory();
  SELECT public.flag_expired_inventory();
$$;

-- Trigger function: stamp updated_at on profile changes
CREATE OR REPLACE FUNCTION public.touch_profiles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  new.updated_at := now();
  RETURN new;
END;
$$;

-- Trigger function: bootstrap a new user's profile and kitchen on sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_meta jsonb := new.raw_user_meta_data;
BEGIN
  PERFORM public.sync_profile_from_auth_for_user(new.id, new.email, v_meta);
  PERFORM public.create_default_kitchen_for_user(
    new.id,
    coalesce(v_meta->>'full_name', v_meta->>'name'),
    new.email
  );
  RETURN new;
END;
$$;

-- Trigger function: cascade-delete all user data before profile deletion
CREATE OR REPLACE FUNCTION public.handle_profile_deleted()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.cascade_delete_user_data(old.id);
  RETURN old;
END;
$$;

-- Trigger function: sync profile when auth user metadata is updated
CREATE OR REPLACE FUNCTION public.sync_profile_from_auth()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.sync_profile_from_auth_for_user(new.id, new.email, new.raw_user_meta_data);
  RETURN new;
END;
$$;


-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE TRIGGER tr_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_profiles_updated_at();

CREATE TRIGGER on_profile_deleted
  BEFORE DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_profile_deleted();

-- Fire on auth.users (populated by auth_stub locally)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_from_auth();


-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kitchens            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kitchen_members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kitchen_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_saved_recipes  ENABLE ROW LEVEL SECURITY;
-- Service-role only — no user-facing policies
ALTER TABLE public.recipe_cache        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes_catalog     ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- RLS POLICIES
-- ============================================================

-- profiles
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY profiles_update ON public.profiles
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- user_preferences
CREATE POLICY user_preferences_select ON public.user_preferences
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY user_preferences_insert ON public.user_preferences
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY user_preferences_update ON public.user_preferences
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- units (read-only for authenticated users)
CREATE POLICY units_read ON public.units
  FOR SELECT TO authenticated USING (true);

-- kitchens
CREATE POLICY kitchens_select ON public.kitchens
  FOR SELECT USING (
    id IN (SELECT kitchen_id FROM public.kitchen_members WHERE user_id = auth.uid())
  );

CREATE POLICY kitchens_insert ON public.kitchens
  FOR INSERT WITH CHECK (
    owner_id = auth.uid()
    AND (created_by IS NULL OR created_by = auth.uid())
  );

CREATE POLICY kitchens_update ON public.kitchens
  FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- kitchen_members
CREATE POLICY kitchen_members_select ON public.kitchen_members
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY kitchen_members_insert ON public.kitchen_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY kitchen_members_update ON public.kitchen_members
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- kitchen_invitations
CREATE POLICY kitchen_invitations_select ON public.kitchen_invitations
  FOR SELECT USING (
    -- kitchen members can see all invitations for their kitchens
    kitchen_id IN (SELECT kitchen_id FROM public.kitchen_members WHERE user_id = auth.uid())
    -- pending invitees can see invitations sent to their email
    OR (
      lower(email) = lower((SELECT email FROM public.profiles WHERE id = auth.uid()))
      AND accepted_at IS NULL
      AND now() < expires_at
    )
    -- accepted invitees can still view their invitation
    OR accepted_by = auth.uid()
  );

CREATE POLICY kitchen_invitations_insert ON public.kitchen_invitations
  FOR INSERT WITH CHECK (
    invited_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.kitchen_members km
      WHERE km.kitchen_id = kitchen_invitations.kitchen_id
        AND km.user_id = auth.uid()
        AND km.role = 'owner'
    )
  );

CREATE POLICY kitchen_invitations_update ON public.kitchen_invitations
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.kitchen_members km
    WHERE km.kitchen_id = kitchen_invitations.kitchen_id
      AND km.user_id = auth.uid() AND km.role = 'owner'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.kitchen_members km
    WHERE km.kitchen_id = kitchen_invitations.kitchen_id
      AND km.user_id = auth.uid() AND km.role = 'owner'
  ));

CREATE POLICY kitchen_invitations_delete ON public.kitchen_invitations
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.kitchen_members km
    WHERE km.kitchen_id = kitchen_invitations.kitchen_id
      AND km.user_id = auth.uid() AND km.role = 'owner'
  ));

-- locations
CREATE POLICY locations_select ON public.locations
  FOR SELECT USING (
    kitchen_id IN (SELECT kitchen_id FROM public.kitchen_members WHERE user_id = auth.uid())
  );

CREATE POLICY locations_insert ON public.locations
  FOR INSERT WITH CHECK (
    kitchen_id IN (SELECT kitchen_id FROM public.kitchen_members WHERE user_id = auth.uid())
  );

CREATE POLICY locations_update ON public.locations
  FOR UPDATE
  USING (kitchen_id IN (SELECT kitchen_id FROM public.kitchen_members WHERE user_id = auth.uid()))
  WITH CHECK (kitchen_id IN (SELECT kitchen_id FROM public.kitchen_members WHERE user_id = auth.uid()));

-- items
CREATE POLICY items_select ON public.items
  FOR SELECT USING (
    kitchen_id IN (SELECT kitchen_id FROM public.kitchen_members WHERE user_id = auth.uid())
  );

CREATE POLICY items_insert ON public.items
  FOR INSERT WITH CHECK (
    kitchen_id IN (SELECT kitchen_id FROM public.kitchen_members WHERE user_id = auth.uid())
    AND (created_by IS NULL OR created_by = auth.uid())
  );

CREATE POLICY items_update ON public.items
  FOR UPDATE
  USING (kitchen_id IN (SELECT kitchen_id FROM public.kitchen_members WHERE user_id = auth.uid()))
  WITH CHECK (kitchen_id IN (SELECT kitchen_id FROM public.kitchen_members WHERE user_id = auth.uid()));

-- receipts
CREATE POLICY receipts_select ON public.receipts
  FOR SELECT USING (
    kitchen_id IN (SELECT kitchen_id FROM public.kitchen_members WHERE user_id = auth.uid())
  );

CREATE POLICY receipts_insert ON public.receipts
  FOR INSERT WITH CHECK (
    kitchen_id IN (SELECT kitchen_id FROM public.kitchen_members WHERE user_id = auth.uid())
    AND (created_by IS NULL OR created_by = auth.uid())
  );

CREATE POLICY receipts_update ON public.receipts
  FOR UPDATE
  USING (kitchen_id IN (SELECT kitchen_id FROM public.kitchen_members WHERE user_id = auth.uid()))
  WITH CHECK (kitchen_id IN (SELECT kitchen_id FROM public.kitchen_members WHERE user_id = auth.uid()));

-- receipt_items
CREATE POLICY receipt_items_select ON public.receipt_items
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.receipts r
    WHERE r.id = receipt_items.receipt_id
      AND r.kitchen_id IN (SELECT kitchen_id FROM public.kitchen_members WHERE user_id = auth.uid())
  ));

CREATE POLICY receipt_items_insert ON public.receipt_items
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.receipts r
    WHERE r.id = receipt_items.receipt_id
      AND r.kitchen_id IN (SELECT kitchen_id FROM public.kitchen_members WHERE user_id = auth.uid())
  ));

CREATE POLICY receipt_items_update ON public.receipt_items
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.receipts r
    WHERE r.id = receipt_items.receipt_id
      AND r.kitchen_id IN (SELECT kitchen_id FROM public.kitchen_members WHERE user_id = auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.receipts r
    WHERE r.id = receipt_items.receipt_id
      AND r.kitchen_id IN (SELECT kitchen_id FROM public.kitchen_members WHERE user_id = auth.uid())
  ));

-- inventory
CREATE POLICY inventory_select ON public.inventory
  FOR SELECT USING (
    kitchen_id IN (SELECT kitchen_id FROM public.kitchen_members WHERE user_id = auth.uid())
  );

CREATE POLICY inventory_insert ON public.inventory
  FOR INSERT WITH CHECK (
    kitchen_id IN (SELECT kitchen_id FROM public.kitchen_members WHERE user_id = auth.uid())
    AND (created_by IS NULL OR created_by = auth.uid())
  );

CREATE POLICY inventory_update ON public.inventory
  FOR UPDATE
  USING (kitchen_id IN (SELECT kitchen_id FROM public.kitchen_members WHERE user_id = auth.uid()))
  WITH CHECK (kitchen_id IN (SELECT kitchen_id FROM public.kitchen_members WHERE user_id = auth.uid()));

CREATE POLICY inventory_delete ON public.inventory
  FOR DELETE USING (
    kitchen_id IN (SELECT kitchen_id FROM public.kitchen_members WHERE user_id = auth.uid())
  );

-- alerts
CREATE POLICY alerts_select ON public.alerts
  FOR SELECT USING (
    kitchen_id IN (SELECT kitchen_id FROM public.kitchen_members WHERE user_id = auth.uid())
  );

CREATE POLICY alerts_insert ON public.alerts
  FOR INSERT WITH CHECK (
    kitchen_id IN (SELECT kitchen_id FROM public.kitchen_members WHERE user_id = auth.uid())
    AND (created_by IS NULL OR created_by = auth.uid())
  );

CREATE POLICY alerts_update ON public.alerts
  FOR UPDATE
  USING (kitchen_id IN (SELECT kitchen_id FROM public.kitchen_members WHERE user_id = auth.uid()))
  WITH CHECK (kitchen_id IN (SELECT kitchen_id FROM public.kitchen_members WHERE user_id = auth.uid()));

-- user_saved_recipes
CREATE POLICY user_saved_recipes_select ON public.user_saved_recipes
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY user_saved_recipes_insert ON public.user_saved_recipes
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY user_saved_recipes_update ON public.user_saved_recipes
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY user_saved_recipes_delete ON public.user_saved_recipes
  FOR DELETE USING (user_id = auth.uid());
