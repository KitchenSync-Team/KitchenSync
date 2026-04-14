-- Normalize kitchen roles to the app model: owner/member.
-- This migration is idempotent and safe to re-run.

-- 1) Remove legacy role checks so transitional values are allowed during backfill.
ALTER TABLE kitchen_members DROP CONSTRAINT IF EXISTS household_members_role_check;
ALTER TABLE kitchen_invitations DROP CONSTRAINT IF EXISTS household_invitations_role_check;

-- 2) Convert legacy/unknown member roles to member.
UPDATE kitchen_members
SET role = 'member'
WHERE role IS NULL OR role NOT IN ('owner', 'member');

-- 3) Ensure kitchen owners have an owner membership row.
INSERT INTO kitchen_members (kitchen_id, user_id, role, joined_at, accepted_at, created_by)
SELECT k.id, k.owner_id, 'owner', now(), now(), k.owner_id
FROM kitchens AS k
LEFT JOIN kitchen_members AS km
  ON km.kitchen_id = k.id
 AND km.user_id = k.owner_id
WHERE k.owner_id IS NOT NULL
  AND km.user_id IS NULL;

-- 4) Promote existing owner membership rows to owner.
UPDATE kitchen_members AS km
SET role = 'owner'
FROM kitchens AS k
WHERE km.kitchen_id = k.id
  AND km.user_id = k.owner_id
  AND km.role <> 'owner';

-- 5) Convert legacy/unknown invitation roles to member.
UPDATE kitchen_invitations
SET role = 'member'
WHERE role IS NULL OR role NOT IN ('owner', 'member');

-- 6) Align DB defaults with app behavior.
ALTER TABLE kitchen_members ALTER COLUMN role SET DEFAULT 'member';
ALTER TABLE kitchen_invitations ALTER COLUMN role SET DEFAULT 'member';

-- 7) Restrict role checks to owner/member only.
ALTER TABLE kitchen_members
  ADD CONSTRAINT household_members_role_check
  CHECK (role = ANY (ARRAY['owner'::text, 'member'::text]));

ALTER TABLE kitchen_invitations
  ADD CONSTRAINT household_invitations_role_check
  CHECK (role = ANY (ARRAY['owner'::text, 'member'::text]));

-- 8) Remove editor from invite-management policy semantics (owner-only).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'kitchen_invitations'
      AND policyname = 'invites_owner_editor_manage'
  ) THEN
    EXECUTE $sql$
      ALTER POLICY invites_owner_editor_manage ON public.kitchen_invitations
      USING (
        EXISTS (
          SELECT 1
          FROM kitchen_members m
          WHERE m.kitchen_id = kitchen_invitations.kitchen_id
            AND m.user_id = auth.uid()
            AND m.role = 'owner'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM kitchen_members m
          WHERE m.kitchen_id = kitchen_invitations.kitchen_id
            AND m.user_id = auth.uid()
            AND m.role = 'owner'
        )
      )
    $sql$;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'kitchen_invitations'
      AND policyname = 'invites_insert_member'
  ) THEN
    EXECUTE $sql$
      ALTER POLICY invites_insert_member ON public.kitchen_invitations
      WITH CHECK (
        invited_by = auth.uid()
        AND EXISTS (
          SELECT 1
          FROM kitchen_members km
          WHERE km.kitchen_id = kitchen_invitations.kitchen_id
            AND km.user_id = auth.uid()
            AND km.role = 'owner'
        )
      )
    $sql$;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'kitchen_invitations'
      AND policyname = 'invites_update_member'
  ) THEN
    EXECUTE $sql$
      ALTER POLICY invites_update_member ON public.kitchen_invitations
      USING (
        EXISTS (
          SELECT 1
          FROM kitchen_members km
          WHERE km.kitchen_id = kitchen_invitations.kitchen_id
            AND km.user_id = auth.uid()
            AND km.role = 'owner'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM kitchen_members km
          WHERE km.kitchen_id = kitchen_invitations.kitchen_id
            AND km.user_id = auth.uid()
            AND km.role = 'owner'
        )
      )
    $sql$;
  END IF;
END
$$;