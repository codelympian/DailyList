-- Tie the application profile to the Supabase identity, where one exists.
--
-- Prisma cannot express a cross-schema relation to auth.users without the
-- multiSchema preview feature, so the constraint is declared here in SQL.
-- This is the integrity Path B buys us: a profile row cannot exist without a
-- matching Supabase user, and deleting the identity removes the profile
-- (cascading on to memberships, so no orphaned tenant access is left behind).
--
-- The guard keeps migrations portable: Supabase databases get the constraint,
-- while a plain PostgreSQL instance (local development and the test suite,
-- which has no auth schema) skips it and is otherwise identical.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'auth' AND table_name = 'users'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_id_auth_users_fkey'
  ) THEN
    ALTER TABLE "users"
      ADD CONSTRAINT "users_id_auth_users_fkey"
      FOREIGN KEY ("id") REFERENCES auth.users ("id") ON DELETE CASCADE;
  END IF;
END $$;
