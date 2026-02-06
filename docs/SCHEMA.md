# KitchenSync Data Model & RLS Notes (Inferred)

This document is **inferred from application code** (queries and writes) and is
meant to describe expected tables, relationships, and RLS assumptions. It is not
a substitute for authoritative schema migrations.

## Core Tables (Inferred)

- `profiles`
  - User profile data (`first_name`, `last_name`, `full_name`, `email`, `avatar_url`, `sex`, `onboarding_complete`).
- `user_preferences`
  - Per-user preferences (`default_kitchen_id`, dietary/cuisine lists, `personalization_opt_in`, `units_system`, `locale`, `email_opt_in`, `push_opt_in`).
- `kitchens`
  - Top-level kitchen entity (`name`, `icon_key`, `updated_at`).
- `kitchen_members`
  - Membership join table (`kitchen_id`, `user_id`, `role`, `joined_at`).
- `kitchen_invitations`
  - Pending invites (`kitchen_id`, `email`, `role`, `invited_by`, `expires_at`, `accepted_at`).
- `locations`
  - Storage locations (`kitchen_id`, `name`, `icon`, `is_default`, `sort_order`).
- `items`
  - Pantry items (`kitchen_id`, `name`, `brand`, `category`, `notes`, `image_url`, `aisle`,
    `ingredient_catalog_id`, `grocery_product_id`, `spoonacular_ingredient_id`, `is_archived`).
- `inventory`
  - Inventory entries (`kitchen_id`, `item_id`, `location_id`, `unit_id`, `quantity`,
    `expires_at`, `notes`, `created_by`, `source`).
- `inventory_units`
  - Alternative inventory table used in `lib/supabase/inventory.ts` (may overlap with `inventory`).
- `units`
  - Measurement units (`name`, `abbreviation`, `type`).
- `alerts`
  - Expiration alerts (`kitchen_id`, `inventory_unit_id`, `type`, `alert_date`, `acknowledged`).
- `receipts`
  - Receipt records (`kitchen_id`, `merchant_name`, `total`, `purchased_at`, `source`).
- `recipe_cache`
  - Cache table for Spoonacular/ingredient/map results (`cache_key`, `results`, `expires_at`).
- `ingredients_catalog`
  - Spoonacular ingredient catalog (`spoonacular_id`, `name`, `brand`, `aisle`, `category`,
    `image_url`, `possible_units`, `badges`, `raw`).
- `grocery_products`
  - Spoonacular grocery products (`spoonacular_id`, `title`, `image_url`, `badges`,
    `nutrition`, `raw`, `upc`, `category`, `brand`).

## Relationships (Inferred)

- `kitchens` 1—many `kitchen_members`
- `kitchens` 1—many `locations`
- `kitchens` 1—many `items`
- `items` 1—many `inventory`
- `locations` 1—many `inventory`
- `units` 1—many `inventory`
- `items` optional FK → `ingredients_catalog` / `grocery_products`
- `alerts.inventory_unit_id` references either `inventory` or `inventory_units`

## RLS Assumptions

Most app reads/writes are via the **anon** client with RLS expected to enforce:
- A user can read/write only rows for kitchens they belong to.
- `profiles` are scoped to the authenticated user.
- `user_preferences` are scoped to the authenticated user.

Service-role usage bypasses RLS and is used for:
- Cache reads/writes in `recipe_cache`.
- Aggregated kitchen snapshot in `lib/domain/kitchen.ts`.
- Spoonacular catalog ingestion (`ingredients_catalog`, `grocery_products`).
- Pantry ingredient resolution in `lib/recipes/preferences.ts`.

When adding new service-role usage, always:
- Check membership/ownership in `kitchen_members`.
- Avoid trusting user-supplied kitchen IDs without validation.

## Known Gaps

- Migrations in `supabase/migrations/` are minimal and do not fully define the schema.
- RLS policies are not encoded in migrations here; keep a separate canonical source.

## Suggested Next Step

Add real schema + RLS migrations or a schema export that matches this document,
then keep this file updated with actual column definitions.
