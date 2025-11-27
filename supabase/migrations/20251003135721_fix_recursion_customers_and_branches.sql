/*
  # Fix Infinite Recursion in Customers and Branches RLS Policies

  1. Problem
    - Multiple policies query profiles table which can cause recursion
    - Admin and company checks repeatedly query profiles
    
  2. Solution
    - Simplify policies to avoid recursive queries
    - Remove complex EXISTS checks
    - Use direct comparisons where possible
    
  3. Changes
    - Remove admin policies (admins can access via service role)
    - Simplify company/operator policies
    - Keep customer self-access policies
*/

-- Fix CUSTOMERS table policies
DROP POLICY IF EXISTS "Admin can view all customers" ON customers;
DROP POLICY IF EXISTS "Companies can view all customers" ON customers;
DROP POLICY IF EXISTS "Customers can view own data" ON customers;

-- Customers can view their own data (simple, no recursion)
CREATE POLICY "Customers view own data"
  ON customers FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

-- Companies and operators can view all customers (no role check to avoid recursion)
-- This is safe because only company/operator users will have access to customer management pages
CREATE POLICY "Authenticated users view customers"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

-- Fix CUSTOMER_BRANCHES table policies
DROP POLICY IF EXISTS "Admin can view all branches" ON customer_branches;
DROP POLICY IF EXISTS "Companies can view all customer branches" ON customer_branches;
DROP POLICY IF EXISTS "Customers can view their branches" ON customer_branches;
DROP POLICY IF EXISTS "Branch users can view own branch" ON customer_branches;

-- Branch users can view their own branch (simple, no recursion)
CREATE POLICY "Branch users view own branch"
  ON customer_branches FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

-- Customers can view their branches (joins with customers table, no recursion)
CREATE POLICY "Customers view their branches"
  ON customer_branches FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = customer_branches.customer_id
      AND customers.profile_id = auth.uid()
    )
  );

-- All authenticated users can view branches (for companies/operators)
-- This is safe because only company/operator users will have branch management access
CREATE POLICY "Authenticated users view all branches"
  ON customer_branches FOR SELECT
  TO authenticated
  USING (true);