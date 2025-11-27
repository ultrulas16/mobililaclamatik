/*
  # Create OAuth User Trigger
  
  1. Changes
    - Create trigger to automatically handle Google OAuth users
    - Trigger creates profile and company when new OAuth user signs in
    - Works for all OAuth providers (Google, etc.)
  
  2. Security
    - Trigger runs with SECURITY DEFINER privileges
    - Automatically accepts terms and privacy policy
    - Creates default company for company role
*/

-- Drop all existing triggers and function with CASCADE
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_created_oauth ON auth.users CASCADE;
DROP FUNCTION IF EXISTS handle_oauth_user() CASCADE;

-- Create the OAuth handler function
CREATE OR REPLACE FUNCTION handle_oauth_user()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id uuid;
  v_full_name text;
BEGIN
  -- Only handle OAuth users (those with provider data and provider is not 'email')
  IF NEW.raw_app_meta_data ? 'provider' AND NEW.raw_app_meta_data->>'provider' != 'email' THEN
    
    -- Check if profile already exists
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
      
      -- Get full name from metadata
      v_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
      );
      
      -- Create company first
      INSERT INTO public.companies (
        name,
        owner_id,
        email,
        currency
      ) VALUES (
        v_full_name || ' Pest Control',
        NEW.id,
        NEW.email,
        'TRY'
      ) RETURNING id INTO v_company_id;
      
      -- Then create profile linked to company
      INSERT INTO public.profiles (
        id,
        email,
        full_name,
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
        'company',
        v_company_id,
        v_full_name || ' Pest Control',
        true,
        true,
        now(),
        now()
      );
      
    END IF;
    
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires after user is created
CREATE TRIGGER on_auth_user_created_oauth
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_oauth_user();
