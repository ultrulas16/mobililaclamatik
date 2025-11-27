/*
  # Fix Admin UPDATE and DELETE Policies

  1. Problem
    - Admin UPDATE and DELETE policies also cause infinite recursion
    - They query profiles table while checking profiles table access

  2. Solution
    - Use auth.jwt() to check role from JWT claims
    - Avoids circular dependency

  3. Changes
    - Drop existing admin UPDATE and DELETE policies
    - Create new policies using JWT role check
*/

-- Drop the problematic policies
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete all profiles" ON profiles;

-- Create new admin update policy using JWT
CREATE POLICY "Admins can update all profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
    OR 
    (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'admin'
  )
  WITH CHECK (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
    OR 
    (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'admin'
  );

-- Create new admin delete policy using JWT (still prevent self-deletion)
CREATE POLICY "Admins can delete all profiles"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (
    (
      (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
      OR 
      (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'admin'
    )
    AND profiles.id != auth.uid()
  );
