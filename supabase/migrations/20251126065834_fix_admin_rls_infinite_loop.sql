/*
  # Fix Admin RLS Infinite Loop

  1. Problem
    - Admin SELECT policy causes infinite recursion by querying profiles table
    - This blocks all profile reads and causes login to hang

  2. Solution
    - Use auth.jwt() to check role from JWT claims instead of querying profiles
    - This avoids the circular dependency

  3. Changes
    - Drop existing admin SELECT policy
    - Create new policy using JWT role check
*/

-- Drop the problematic admin view policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Create new admin view policy using JWT instead of table query
CREATE POLICY "Admins can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
    OR 
    (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'admin'
  );
