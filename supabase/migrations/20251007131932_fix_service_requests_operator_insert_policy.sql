/*
  # Fix Service Requests Insert Policy for Operators

  1. Problem
    - The current insert policy has an incorrect JOIN condition
    - It's joining `companies.owner_id = operators.company_id` 
    - Should be `companies.id = operators.company_id`
    
  2. Changes
    - Drop the existing insert policy
    - Create a corrected policy with proper JOIN condition
    
  3. Security
    - Maintains RLS protection
    - Allows operators to create service requests for their company
    - Allows company owners to create service requests
    - Allows customers to create service requests for themselves
*/

-- Drop existing insert policy
DROP POLICY IF EXISTS "Allow authenticated users to create service requests" ON service_requests;

-- Create corrected insert policy
CREATE POLICY "Allow authenticated users to create service requests"
  ON service_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Company owners can create for their company
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
    OR
    -- Operators can create for their company
    company_id IN (
      SELECT o.company_id 
      FROM operators o
      WHERE o.profile_id = auth.uid()
    )
    OR
    -- Customers can create for themselves
    customer_id IN (
      SELECT id FROM customers WHERE profile_id = auth.uid()
    )
  );
