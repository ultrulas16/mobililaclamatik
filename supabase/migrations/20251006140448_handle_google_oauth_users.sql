/*
  # Handle Google OAuth Users

  1. Changes
    - Create a trigger function to automatically create profile for OAuth users
    - Add trigger to auth.users table for new OAuth signups
  
  2. Security
    - Function runs with security definer privileges
    - Only creates profile if it doesn't exist
*/

CREATE OR REPLACE FUNCTION handle_oauth_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = NEW.id
  ) THEN
    INSERT INTO profiles (
      id,
      email,
      full_name,
      role,
      accepted_privacy_policy,
      accepted_terms_of_service,
      privacy_policy_accepted_at,
      terms_of_service_accepted_at
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
      'customer',
      true,
      true,
      NOW(),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_oauth_user();
