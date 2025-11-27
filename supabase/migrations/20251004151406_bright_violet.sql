/*
  # Fix Operator Access to Company Customers and Branches

  1. Security Updates
    - Add RLS policies for operators to access company customers
    - Add RLS policies for operators to access customer branches
    - Ensure operators can only see their company's data

  2. Performance
    - Add indexes for faster queries
    - Optimize operator data access
*/

-- Add index for operators table for faster lookups
CREATE INDEX IF NOT EXISTS idx_operators_profile_company ON operators(profile_id, company_id);

-- Add RLS policy for operators to view company customers
CREATE POLICY "Operators can view company customers"
  ON customers
  FOR SELECT
  TO authenticated
  USING (
    created_by_company_id IN (
      SELECT company_id 
      FROM operators 
      WHERE profile_id = auth.uid()
    )
  );

-- Add RLS policy for operators to view customer branches
CREATE POLICY "Operators can view customer branches"
  ON customer_branches
  FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT c.id
      FROM customers c
      JOIN operators o ON c.created_by_company_id = o.company_id
      WHERE o.profile_id = auth.uid()
    )
  );

-- Add RLS policy for operators to create service requests for company customers
CREATE POLICY "Operators can create service requests for company customers"
  ON service_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_id IN (
      SELECT c.id
      FROM customers c
      JOIN operators o ON c.created_by_company_id = o.company_id
      WHERE o.profile_id = auth.uid()
    )
    AND operator_id = auth.uid()
  );

-- Update existing service request policy to be more specific
DROP POLICY IF EXISTS "Enable insert for customers and companies" ON service_requests;

CREATE POLICY "Enable insert for customers and companies"
  ON service_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Company owners can create service requests
    (company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    ))
    OR
    -- Customers can create service requests for themselves
    (customer_id IN (
      SELECT id FROM customers WHERE profile_id = auth.uid()
    ))
    OR
    -- Operators can create service requests for their company's customers
    (operator_id = auth.uid() AND customer_id IN (
      SELECT c.id
      FROM customers c
      JOIN operators o ON c.created_by_company_id = o.company_id
      WHERE o.profile_id = auth.uid()
    ))
  );