/*
  # Fix Policies and Permissions
  
  ## Changes
  
  1. Clean up duplicate policies
  2. Add missing DELETE policy for profiles
  3. Ensure correct policy configuration
  
  ## Details
  
  - Remove duplicate operator policies
  - Add profile deletion policy for companies
  - Fix policy conflicts
*/

-- Drop duplicate policies
DROP POLICY IF EXISTS "Companies delete their operators" ON operators;
DROP POLICY IF EXISTS "Companies update their operators" ON operators;

-- Profiles need DELETE policy for companies to delete users they created
DROP POLICY IF EXISTS "Companies can delete created users" ON profiles;
CREATE POLICY "Companies can delete created users"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (
    id IN (
      SELECT profile_id FROM operators WHERE company_id = auth.uid()
      UNION
      SELECT profile_id FROM customers WHERE created_by_company_id = auth.uid()
      UNION
      SELECT profile_id FROM customer_branches WHERE created_by_company_id = auth.uid()
    )
  );
