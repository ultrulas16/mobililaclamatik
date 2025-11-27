/*
  # Fix Infinite Recursion in RLS Policies

  ## Problem
  Policies that check profiles table while executing on profiles table cause infinite recursion.

  ## Solution
  1. Remove recursive policy checks (policies checking profiles while on profiles table)
  2. Use simple auth.uid() checks instead
  3. Keep policies minimal and non-recursive

  ## Changes
  - Drop all existing policies on profiles
  - Create simple, non-recursive policies
  - Ensure users can only access their own data
*/

-- Drop all existing policies on profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile during registration" ON profiles;
DROP POLICY IF EXISTS "Company can view their operators and customers" ON profiles;

-- Create simple, non-recursive policies for profiles
CREATE POLICY "Enable read access for users to own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Enable insert for authenticated users"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable update for users based on id"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Drop and recreate companies policies without recursion
DROP POLICY IF EXISTS "Companies can view own data" ON companies;
DROP POLICY IF EXISTS "Authenticated users can insert companies" ON companies;
DROP POLICY IF EXISTS "Company owners can update own company" ON companies;

CREATE POLICY "Enable read access for company owners"
  ON companies FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Enable insert for authenticated users creating companies"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Enable update for company owners"
  ON companies FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Drop and recreate customers policies
DROP POLICY IF EXISTS "Customers can view own data" ON customers;
DROP POLICY IF EXISTS "Admin and companies can insert customers" ON customers;
DROP POLICY IF EXISTS "Customers can update own data" ON customers;

CREATE POLICY "Enable read access for customer owners"
  ON customers FOR SELECT
  TO authenticated
  USING (auth.uid() = profile_id);

CREATE POLICY "Enable insert for authenticated users"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Enable update for customer owners"
  ON customers FOR UPDATE
  TO authenticated
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- Drop and recreate customer_branches policies
DROP POLICY IF EXISTS "Branches can view own data" ON customer_branches;
DROP POLICY IF EXISTS "Customers can insert branches" ON customer_branches;
DROP POLICY IF EXISTS "Branches can update own data" ON customer_branches;

CREATE POLICY "Enable read for branch profiles and parent customers"
  ON customer_branches FOR SELECT
  TO authenticated
  USING (
    auth.uid() = profile_id 
    OR auth.uid() IN (
      SELECT profile_id FROM customers WHERE id = customer_branches.customer_id
    )
  );

CREATE POLICY "Enable insert for customers"
  ON customer_branches FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT profile_id FROM customers WHERE id = customer_branches.customer_id
    )
  );

CREATE POLICY "Enable update for branch profiles"
  ON customer_branches FOR UPDATE
  TO authenticated
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- Drop and recreate service_requests policies
DROP POLICY IF EXISTS "Service requests viewable by related users" ON service_requests;
DROP POLICY IF EXISTS "Companies and customers can insert service requests" ON service_requests;
DROP POLICY IF EXISTS "Related users can update service requests" ON service_requests;

CREATE POLICY "Enable read for related parties"
  ON service_requests FOR SELECT
  TO authenticated
  USING (
    auth.uid() = operator_id
    OR auth.uid() IN (SELECT owner_id FROM companies WHERE id = service_requests.company_id)
    OR auth.uid() IN (SELECT profile_id FROM customers WHERE id = service_requests.customer_id)
    OR auth.uid() IN (SELECT profile_id FROM customer_branches WHERE id = service_requests.branch_id)
  );

CREATE POLICY "Enable insert for customers and companies"
  ON service_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (SELECT owner_id FROM companies WHERE id = service_requests.company_id)
    OR auth.uid() IN (SELECT profile_id FROM customers WHERE id = service_requests.customer_id)
  );

CREATE POLICY "Enable update for companies and operators"
  ON service_requests FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = operator_id
    OR auth.uid() IN (SELECT owner_id FROM companies WHERE id = service_requests.company_id)
  )
  WITH CHECK (
    auth.uid() = operator_id
    OR auth.uid() IN (SELECT owner_id FROM companies WHERE id = service_requests.company_id)
  );
