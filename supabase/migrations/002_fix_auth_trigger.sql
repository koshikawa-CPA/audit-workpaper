-- ============================================================
-- Fix: "Database error saving new user" on signup
--
-- Root causes:
--   1. handle_new_user lacks SET search_path = public, causing
--      schema resolution to fail in the auth trigger context
--   2. INSERT policy has no TO clause, causing ambiguity with
--      the postgres role used by SECURITY DEFINER triggers
--   3. No exception handling: trigger failure rolls back the
--      entire auth.users INSERT transaction
-- ============================================================

-- ----------------------------------------------------------------
-- 1. Fix handle_new_user trigger function
--    - Add SET search_path = public (required for SECURITY DEFINER
--      functions to resolve public.profiles correctly)
--    - Always default role to 'creator' (never trust user metadata
--      for role assignment — prevents privilege escalation)
--    - Wrap in EXCEPTION handler so trigger never kills the signup
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
      split_part(COALESCE(NEW.email, 'user@unknown'), '@', 1)
    ),
    'creator'  -- Always default to creator; admin promotes via UI
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the error but never block the signup
  RAISE LOG 'handle_new_user error for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ----------------------------------------------------------------
-- 2. Fix RLS INSERT policies on profiles
--    The original policy had no TO clause, so it could be
--    overridden by Supabase's default-deny for specific roles.
--    Replace with explicit role-scoped policies.
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;

-- postgres role: used by SECURITY DEFINER triggers (handle_new_user)
CREATE POLICY "postgres can insert profiles" ON public.profiles
  FOR INSERT TO postgres
  WITH CHECK (true);

-- authenticated role: allows users to insert their own profile row
-- (fallback path in dashboard layout when trigger hasn't fired yet)
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- service_role: used by Supabase admin SDK and Edge Functions
CREATE POLICY "Service role can insert profiles" ON public.profiles
  FOR INSERT TO service_role
  WITH CHECK (true);

-- ----------------------------------------------------------------
-- 3. Ensure the trigger is (re)attached to auth.users
--    Safe to run even if it already exists
-- ----------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
