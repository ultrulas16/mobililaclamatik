/*
  # Handle OAuth Users Trigger

  1. New Function
    - `handle_oauth_user()` - Automatically creates profile for OAuth users
  
  2. Trigger
    - Runs after user creation in auth.users table
    - Only for OAuth users (those with provider data)
    - Creates basic profile with company role by default
*/

-- Function to handle OAuth user creation
CREATE OR REPLACE FUNCTION handle_oauth_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only handle OAuth users (those with provider data)
  IF NEW.raw_app_meta_data ? 'provider' AND NEW.raw_app_meta_data->>'provider' != 'email' THEN
    -- Insert profile for OAuth user
    INSERT INTO public.profiles (
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
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
      'company', -- Default role for OAuth users
      true,
      true,
      now(),
      now()
    ) ON CONFLICT (id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for OAuth user handling
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_oauth_user();