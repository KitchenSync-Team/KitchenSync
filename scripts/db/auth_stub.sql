-- ============================================================
-- Auth Stub for Local Development
-- ============================================================
-- Creates a minimal auth schema that mirrors the Supabase auth
-- schema so that bootstrap.sql can reference auth.users and
-- auth.uid() without a real Supabase instance.
--
-- USAGE: Run this BEFORE bootstrap.sql
--   psql ... -f scripts/db/auth_stub.sql
--
-- To simulate a logged-in user in RLS tests:
--   SET app.current_user_id = '<your-uuid>';
--   INSERT INTO auth.users (id) VALUES ('<your-uuid>');
-- ============================================================

CREATE SCHEMA IF NOT EXISTS auth;

-- Minimal auth.users table (Supabase adds many more columns,
-- but handle_new_user only needs id, email, raw_user_meta_data)
CREATE TABLE IF NOT EXISTS auth.users (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email              text,
  raw_user_meta_data jsonb DEFAULT '{}'::jsonb
);

-- auth.uid() reads from a session variable so RLS policies work
-- in local tests. Set it with: SET app.current_user_id = '<uuid>';
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')::uuid;
$$;
