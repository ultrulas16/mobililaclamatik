/*
  # Fix Service Requests Insert Policy

  1. Changes
    - Drop existing complex insert policies
    - Create a simpler insert policy that allows:
      - Company owners to create service requests for their company
      - Operators to create service requests for their company's customers
      - Customers to create service requests for themselves
    
  2. Security
    - Maintains RLS protection
    - Simplifies permission logic
    - Allows operators to create visits without complex customer checks
*/

-- Drop existing insert policies
DROP POLICY IF EXISTS "Enable insert for customers and companies" ON service_requests;
DROP POLICY IF EXISTS "Operators can create service requests for company customers" ON service_requests;

-- Create new simplified insert policy
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
      SELECT c.id 
      FROM companies c
      JOIN operators o ON c.owner_id = o.company_id
      WHERE o.profile_id = auth.uid()
    )
    OR
    -- Customers can create for themselves
    customer_id IN (
      SELECT id FROM customers WHERE profile_id = auth.uid()
    )
  );
