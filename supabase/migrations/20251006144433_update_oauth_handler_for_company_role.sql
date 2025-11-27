/*
  # Update OAuth Handler for Company Role

  1. Changes
    - Update OAuth trigger to create users with 'company' role
    - Automatically create a company record for OAuth users
    - Link the profile to the created company
  
  2. Security
    - Function runs with security definer privileges
    - Only creates profile and company if they don't exist
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_oauth_user();

-- Create updated function for OAuth users
CREATE OR REPLACE FUNCTION handle_oauth_user()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id uuid;
  v_full_name text;
BEGIN
  -- Only process if profile doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = NEW.id
  ) THEN
    -- Extract full name from metadata
    v_full_name := COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    );

    -- Create a company for this user
    INSERT INTO companies (
      name,
      email,
      phone,
      address,
      active
    ) VALUES (
      v_full_name || '''s Company',
      NEW.email,
      '',
      '',
      true
    ) RETURNING id INTO v_company_id;

    -- Create profile with company role
    INSERT INTO profiles (
      id,
      email,
      full_name,
      phone,
      role,
      company_id,
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
      true,
      true,
      NOW(),
      NOW()
    );

    -- Update company's created_by field
    UPDATE companies 
    SET created_by = NEW.id 
    WHERE id = v_company_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_oauth_user();
