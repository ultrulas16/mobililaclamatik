/*
  # Fix Admin RLS with Hardcoded Admin ID

  1. Problem
    - Cannot use profiles table query in RLS policies (causes recursion)
    - Cannot use JWT because role is not stored in JWT
    
  2. Solution
    - Use hardcoded admin user ID in policies
    - This is safe because admin is a single special account
    
  3. Changes
    - Update all admin policies to use hardcoded admin ID
    - Admin ID: 23399c79-ddc4-448f-8fc1-930b8ef0e46b
*/

-- Drop all JWT-based admin policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete all profiles" ON profiles;

-- Create hardcoded admin policies for profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = '23399c79-ddc4-448f-8fc1-930b8ef0e46b'::uuid);

CREATE POLICY "Admins can update all profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = '23399c79-ddc4-448f-8fc1-930b8ef0e46b'::uuid)
  WITH CHECK (auth.uid() = '23399c79-ddc4-448f-8fc1-930b8ef0e46b'::uuid);

CREATE POLICY "Admins can delete all profiles"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = '23399c79-ddc4-448f-8fc1-930b8ef0e46b'::uuid
    AND profiles.id != auth.uid()
  );

-- Update subscriptions policies
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Admins can update all subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Admins can insert subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Admins can delete subscriptions" ON subscriptions;

CREATE POLICY "Admins can view all subscriptions"
  ON subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = '23399c79-ddc4-448f-8fc1-930b8ef0e46b'::uuid);

CREATE POLICY "Admins can update all subscriptions"
  ON subscriptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = '23399c79-ddc4-448f-8fc1-930b8ef0e46b'::uuid)
  WITH CHECK (auth.uid() = '23399c79-ddc4-448f-8fc1-930b8ef0e46b'::uuid);

CREATE POLICY "Admins can insert subscriptions"
  ON subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = '23399c79-ddc4-448f-8fc1-930b8ef0e46b'::uuid);

CREATE POLICY "Admins can delete subscriptions"
  ON subscriptions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = '23399c79-ddc4-448f-8fc1-930b8ef0e46b'::uuid);

-- Update companies policies
DROP POLICY IF EXISTS "Admins can view all companies" ON companies;
DROP POLICY IF EXISTS "Admins can update all companies" ON companies;
DROP POLICY IF EXISTS "Admins can delete companies" ON companies;

CREATE POLICY "Admins can view all companies"
  ON companies
  FOR SELECT
  TO authenticated
  USING (auth.uid() = '23399c79-ddc4-448f-8fc1-930b8ef0e46b'::uuid);

CREATE POLICY "Admins can update all companies"
  ON companies
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = '23399c79-ddc4-448f-8fc1-930b8ef0e46b'::uuid)
  WITH CHECK (auth.uid() = '23399c79-ddc4-448f-8fc1-930b8ef0e46b'::uuid);

CREATE POLICY "Admins can delete companies"
  ON companies
  FOR DELETE
  TO authenticated
  USING (auth.uid() = '23399c79-ddc4-448f-8fc1-930b8ef0e46b'::uuid);
