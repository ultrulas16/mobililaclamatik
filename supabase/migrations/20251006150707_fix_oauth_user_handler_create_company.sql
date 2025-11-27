/*
  # Fix OAuth User Handler to Create Company

  1. Changes
    - Update handle_oauth_user function to create both company and profile
    - When OAuth user registers, automatically create a company with their name
    - Link the profile to the newly created company
  
  2. Security
    - Function runs with security definer privileges
    - Only creates records if they don't exist
*/

CREATE OR REPLACE FUNCTION handle_oauth_user()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id uuid;
BEGIN
  -- Only handle OAuth users (those with provider data)
  IF NEW.raw_app_meta_data ? 'provider' AND NEW.raw_app_meta_data->>'provider' != 'email' THEN
    
    -- Check if profile already exists
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
      
      -- Create company first
      INSERT INTO public.companies (
        name,
        email,
        currency
      ) VALUES (
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.email,
        'USD'
      ) RETURNING id INTO v_company_id;
      
      -- Then create profile linked to company
      INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        company_id,
        accepted_privacy_policy,
        accepted_terms_of_service,
        privacy_policy_accepted_at,
        terms_of_service_accepted_at
      ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        'company',
        v_company_id,
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
