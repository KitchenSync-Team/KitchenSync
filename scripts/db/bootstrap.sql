-- ===============================================
--# Database Bootstrap Scripts

--This folder contains SQL scripts to set up a fresh local database for the KitchenSync project.

--## bootstrap.sql

-- **Purpose:** Create all core tables, constraints, and Row-Level Security (RLS) policies so a local environment can be fully initialized from scratch.
-- **Usage:** Only for **local development or testing**. Do not run on production.
-- **How to run locally:**
  
 -- 1. Start a local PostgreSQL database (e.g., via Docker).
 -- 2. Connect to the database using `psql` or Supabase CLI.
 -- 3. Run the bootstrap script:

     --```bash
     --psql -h localhost -U <your_user> -d <your_db> -f bootstrap.sql ```
     

-- **Notes:**
  -- This script is **not an incremental migration**; do not put it in `supabase/migrations`.
  -- Incremental migrations are still tracked in `supabase/migrations` and should be used for production or syncing with Supabase.
  -- Update this script when major schema or RLS changes are made to reflect the latest production shape.

-- ===============================================

-- Enable extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================
-- TABLES
-- =========================

CREATE TABLE public.kitchens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  owner_id uuid,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  icon_key text NOT NULL DEFAULT 'chef-hat'::text,
  CONSTRAINT kitchens_pkey PRIMARY KEY (id)
);

CREATE TABLE public.kitchen_members (
  kitchen_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member'::text CHECK (role = ANY (ARRAY['owner','member'])),
  joined_at timestamp with time zone DEFAULT now(),
  invited_by uuid,
  invited_at timestamp with time zone,
  accepted_at timestamp with time zone,
  created_by uuid,
  CONSTRAINT kitchen_members_pkey PRIMARY KEY (kitchen_id, user_id)
);

CREATE TABLE public.kitchen_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  kitchen_id uuid NOT NULL,
  email text NOT NULL,
  invited_by uuid NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role = ANY (ARRAY['owner','member'])),
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + '7 days'::interval),
  accepted_by uuid,
  accepted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT kitchen_invitations_pkey PRIMARY KEY (id)
);

CREATE TABLE public.items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  kitchen_id uuid NOT NULL,
  name text NOT NULL,
  brand text,
  default_shelf_life_days integer,
  barcode text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  category text,
  notes text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  is_archived boolean DEFAULT false,
  ingredient_catalog_id uuid,
  spoonacular_ingredient_id bigint,
  image_url text,
  aisle text,
  CONSTRAINT items_pkey PRIMARY KEY (id)
);

CREATE TABLE public.inventory (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL,
  kitchen_id uuid NOT NULL,
  location_id uuid,
  quantity numeric DEFAULT 1,
  purchased_at date,
  opened_at date,
  expires_at date,
  notes text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  source text,
  unit_price numeric,
  line_total numeric,
  receipt_item_id uuid,
  unit_id uuid,
  CONSTRAINT inventory_pkey PRIMARY KEY (id)
);

CREATE TABLE public.locations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  kitchen_id uuid NOT NULL,
  name text NOT NULL,
  sort_order integer DEFAULT 0,
  is_default boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  icon text,
  CONSTRAINT locations_pkey PRIMARY KEY (id)
);

CREATE TABLE public.alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  kitchen_id uuid NOT NULL,
  inventory_unit_id uuid NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['expiring_soon','expired'])),
  alert_date date NOT NULL,
  acknowledged boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  CONSTRAINT alerts_pkey PRIMARY KEY (id)
);

CREATE TABLE public.user_saved_recipes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  recipe_id text NOT NULL,
  title text NOT NULL,
  image_url text,
  source_url text,
  saved boolean DEFAULT true,
  cooked boolean DEFAULT false,
  cooked_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  recipes_catalog_id uuid,
  spoonacular_recipe_id bigint,
  CONSTRAINT user_saved_recipes_pkey PRIMARY KEY (id)
);



