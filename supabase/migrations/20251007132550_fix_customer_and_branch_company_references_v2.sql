/*
  # Fix Customer and Branch Company References

  1. Problem
    - customers.created_by_company_id references profiles(id) instead of companies(id)
    - customer_branches.created_by_company_id references profiles(id) instead of companies(id)
    - Data stores profile IDs instead of company IDs
    
  2. Changes
    - Drop incorrect foreign key constraints
    - Update data to use actual company IDs
    - Add correct foreign key constraints
    - Fix RLS policies to work correctly
    
  3. Security
    - Maintains RLS protection
    - Updates policies for correct relationships
*/

-- Drop incorrect foreign key constraints
ALTER TABLE customers 
DROP CONSTRAINT IF EXISTS customers_created_by_company_id_fkey;

ALTER TABLE customer_branches 
DROP CONSTRAINT IF EXISTS customer_branches_created_by_company_id_fkey;

-- Update customers table to use actual company IDs
UPDATE customers
SET created_by_company_id = c.id
FROM companies c
WHERE customers.created_by_company_id = c.owner_id;

-- Update customer_branches table to use actual company IDs  
UPDATE customer_branches
SET created_by_company_id = c.id
FROM companies c
WHERE customer_branches.created_by_company_id = c.owner_id;

-- Add correct foreign key constraints
ALTER TABLE customers
ADD CONSTRAINT customers_created_by_company_id_fkey 
FOREIGN KEY (created_by_company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE customer_branches
ADD CONSTRAINT customer_branches_created_by_company_id_fkey 
FOREIGN KEY (created_by_company_id) REFERENCES companies(id) ON DELETE CASCADE;

-- Update RLS policies for customers
DROP POLICY IF EXISTS "Companies can view their created customers" ON customers;
CREATE POLICY "Companies can view their created customers"
  ON customers FOR SELECT
  TO authenticated
  USING (
    created_by_company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Companies can update their created customers" ON customers;
CREATE POLICY "Companies can update their created customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (
    created_by_company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    created_by_company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Companies can delete their created customers" ON customers;
CREATE POLICY "Companies can delete their created customers"
  ON customers FOR DELETE
  TO authenticated
  USING (
    created_by_company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );

-- Update RLS policies for customer_branches
DROP POLICY IF EXISTS "Companies can update their created branches" ON customer_branches;
CREATE POLICY "Companies can update their created branches"
  ON customer_branches FOR UPDATE
  TO authenticated
  USING (
    created_by_company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    created_by_company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Companies can delete their created branches" ON customer_branches;
CREATE POLICY "Companies can delete their created branches"
  ON customer_branches FOR DELETE
  TO authenticated
  USING (
    created_by_company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );
