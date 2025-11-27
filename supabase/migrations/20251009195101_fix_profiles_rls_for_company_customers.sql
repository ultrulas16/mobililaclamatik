/*
  # Fix Profiles RLS for Company Created Customers

  1. Problem
    - Company users cannot see profiles of customers they created
    - RLS policy checks auth.uid() against created_by_company_id
    - But created_by_company_id is a company ID, not a user ID
    
  2. Changes
    - Update profiles RLS policy to properly check company ownership
    - Allow companies to see profiles of customers/branches they created
    
  3. Security
    - Maintains RLS protection
    - Companies can only see their own created user profiles
*/

-- Drop old policy
DROP POLICY IF EXISTS "Companies can view their created user profiles" ON profiles;

-- Create updated policy that properly checks company relationships
CREATE POLICY "Companies can view their created user profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id 
    OR company_id = auth.uid()
    OR id IN (
      SELECT c.profile_id 
      FROM customers c
      JOIN companies comp ON comp.id = c.created_by_company_id
      WHERE comp.owner_id = auth.uid()
    )
    OR id IN (
      SELECT o.profile_id 
      FROM operators o
      JOIN companies comp ON comp.id = o.company_id
      WHERE comp.owner_id = auth.uid()
    )
    OR id IN (
      SELECT cb.profile_id 
      FROM customer_branches cb
      JOIN companies comp ON comp.id = cb.created_by_company_id
      WHERE comp.owner_id = auth.uid()
    )
  );
