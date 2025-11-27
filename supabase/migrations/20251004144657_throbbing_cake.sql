/*
  # Fix Customer Creation and Visibility Policies

  1. Security Updates
    - Fix RLS policies for customers table
    - Ensure companies can see their created customers
    - Fix profile visibility for customer users

  2. Policy Updates
    - Update customer select policies
    - Fix profile join policies
    - Ensure proper data visibility
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Authenticated users view customers" ON customers;
DROP POLICY IF EXISTS "Companies can view their created customers" ON customers;

-- Create proper customer visibility policies
CREATE POLICY "Companies can view their created customers"
  ON customers
  FOR SELECT
  TO authenticated
  USING (created_by_company_id = auth.uid());

CREATE POLICY "Customers can view own data"
  ON customers
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

-- Ensure profiles are visible for customer joins
DROP POLICY IF EXISTS "View profiles with matching company_id" ON profiles;

CREATE POLICY "Companies can view their created user profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR 
    company_id = auth.uid() OR
    id IN (
      SELECT profile_id FROM customers WHERE created_by_company_id = auth.uid()
    ) OR
    id IN (
      SELECT profile_id FROM operators WHERE company_id = auth.uid()
    ) OR
    id IN (
      SELECT profile_id FROM customer_branches WHERE created_by_company_id = auth.uid()
    )
  );

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_customers_created_by_company_id 
ON customers(created_by_company_id);

-- Ensure customers table has proper structure
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_customers_updated_at();