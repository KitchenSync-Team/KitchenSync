-- create a dummy auth schema
CREATE SCHEMA auth;

-- create a dummy users table with just id
CREATE TABLE auth.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);

-- create a dummy uid() function to simulate Supabase auth
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid AS $$
    SELECT NULL::uuid;
$$ LANGUAGE SQL STABLE;