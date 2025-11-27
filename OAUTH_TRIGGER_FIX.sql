-- ============================================================================
-- GOOGLE OAUTH TRIGGER FIX - FINAL VERSION
-- ============================================================================
-- Run this in your Supabase SQL Editor to fix Google OAuth registration
-- ============================================================================

-- Step 1: Drop all existing OAuth triggers and functions
DROP TRIGGER IF EXISTS on_auth_user_created_oauth ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_oauth_user() CASCADE;

-- Step 2: Create the OAuth handler function with proper error handling
CREATE OR REPLACE FUNCTION handle_oauth_user()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id uuid;
  v_full_name text;
  v_company_name text;
  v_profile_exists boolean;
BEGIN
  -- Log the trigger execution for debugging
  RAISE LOG 'OAuth trigger fired for user: %, provider: %', NEW.id, NEW.raw_app_meta_data->>'provider';

  -- Only handle OAuth users (not email/password users)
  IF NEW.raw_app_meta_data ? 'provider' AND NEW.raw_app_meta_data->>'provider' != 'email' THEN

    -- Check if profile already exists
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = NEW.id) INTO v_profile_exists;

    IF NOT v_profile_exists THEN

      RAISE LOG 'Creating profile for OAuth user: %', NEW.id;

      -- Extract full name from OAuth metadata
      v_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1),
        'User'
      );

      v_company_name := v_full_name || ' Pest Control';

      -- Create company first
      BEGIN
        INSERT INTO public.companies (
          name,
          owner_id,
          email,
          phone,
          address,
          currency
        ) VALUES (
          v_company_name,
          NEW.id,
          NEW.email,
          COALESCE(NEW.raw_user_meta_data->>'phone', ''),
          '',
          'TRY'
        ) RETURNING id INTO v_company_id;

        RAISE LOG 'Company created with id: % for user: %', v_company_id, NEW.id;

      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Error creating company for OAuth user %: %', NEW.id, SQLERRM;
        -- Continue even if company creation fails
        v_company_id := NULL;
      END;

      -- Create profile
      BEGIN
        INSERT INTO public.profiles (
          id,
          email,
          full_name,
          phone,
          role,
          company_id,
          company_name,
          accepted_privacy_policy,
          accepted_terms_of_service,
          privacy_policy_accepted_at,
          terms_of_service_accepted_at
        ) VALUES (
          NEW.id,
          NEW.email,
          v_full_name,
          COALESCE(NEW.raw_user_meta_data->>'phone', ''),
          'company',
          v_company_id,
          v_company_name,
          true,
          true,
          now(),
          now()
        );

        RAISE LOG 'Profile created successfully for OAuth user: %', NEW.id;

      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Error creating profile for OAuth user %: %', NEW.id, SQLERRM;
        -- Re-raise to prevent user creation from succeeding if profile creation fails
        RAISE;
      END;

    ELSE
      RAISE LOG 'Profile already exists for OAuth user: %', NEW.id;
    END IF;

  ELSE
    RAISE LOG 'Not an OAuth user (provider: %), skipping trigger', NEW.raw_app_meta_data->>'provider';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create the trigger
CREATE TRIGGER on_auth_user_created_oauth
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_oauth_user();

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check if trigger exists
SELECT
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgenabled as enabled
FROM pg_trigger
WHERE tgname = 'on_auth_user_created_oauth';

-- Check if function exists
SELECT
  proname as function_name,
  prosrc as function_body
FROM pg_proc
WHERE proname = 'handle_oauth_user';

-- Check recent users and their profiles
SELECT
  u.id,
  u.email,
  u.created_at,
  u.raw_app_meta_data->>'provider' as provider,
  CASE
    WHEN p.id IS NOT NULL THEN 'Has Profile'
    ELSE 'NO PROFILE'
  END as profile_status,
  p.role,
  p.company_id
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.created_at DESC
LIMIT 10;

-- ============================================================================
-- FIX EXISTING OAUTH USERS WITHOUT PROFILES
-- ============================================================================

-- First, find OAuth users without profiles
SELECT
  u.id,
  u.email,
  u.raw_app_meta_data->>'provider' as provider,
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    split_part(u.email, '@', 1)
  ) as name
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
  AND u.raw_app_meta_data->>'provider' IS NOT NULL
  AND u.raw_app_meta_data->>'provider' != 'email';

-- If you see users above, run this for each one:
-- (Replace the values in the DECLARE section with actual values from the query above)

/*
DO $$
DECLARE
  v_user_id uuid := 'REPLACE_WITH_USER_ID';
  v_email text := 'REPLACE_WITH_EMAIL';
  v_full_name text := 'REPLACE_WITH_NAME';
  v_company_id uuid;
  v_company_name text;
BEGIN
  v_company_name := v_full_name || ' Pest Control';

  -- Create company
  INSERT INTO public.companies (name, owner_id, email, phone, address, currency)
  VALUES (v_company_name, v_user_id, v_email, '', '', 'TRY')
  RETURNING id INTO v_company_id;

  -- Create profile
  INSERT INTO public.profiles (
    id, email, full_name, phone, role, company_id, company_name,
    accepted_privacy_policy, accepted_terms_of_service,
    privacy_policy_accepted_at, terms_of_service_accepted_at
  ) VALUES (
    v_user_id, v_email, v_full_name, '', 'company', v_company_id, v_company_name,
    true, true, now(), now()
  );

  RAISE NOTICE 'Profile created for user: % (%)', v_full_name, v_email;
END $$;
*/
