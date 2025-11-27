/*
  # Create Admin User
  
  1. Purpose
    - Creates an initial admin user who can register pest control companies
    - Admin credentials: admin@pestcontrol.com / Admin123!
  
  2. Changes
    - Insert admin profile into profiles table
    - Note: Auth user must be created manually via Supabase Dashboard
  
  3. Security
    - Admin role has no specific RLS policies yet
    - Will be added when admin features are implemented
*/

-- Note: This will fail if auth user doesn't exist
-- You need to manually create auth user first via Supabase Dashboard:
-- Email: admin@pestcontrol.com
-- Password: Admin123!

-- Then get the user ID and insert into profiles
-- This is a placeholder migration for documentation purposes
