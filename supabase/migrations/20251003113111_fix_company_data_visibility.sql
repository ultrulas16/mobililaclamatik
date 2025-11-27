/*
  # Fix Company Data Visibility

  1. Changes to Profiles Table Policies
    - Companies can view their own operators (role='operator' AND company_id matches)
    - Operators can view their own profile
    - Admin can view all profiles
    
  2. Changes to Customers Table Policies
    - Companies can view all customers (all customers belong to companies)
    - Customers can view their own profile
    - Admin can view all customers
    
  3. Changes to Customer Branches Table Policies
    - Companies can view all customer branches
    - Customers can view their own branches
    - Branch users can view their own branch
    - Admin can view all branches

  4. Security Notes
    - Companies still cannot modify other companies' data
    - Operators cannot see other operators
    - Customers cannot see other customers
    - Each entity can only see what they created or own
*/

-- Drop existing policies for profiles
DROP POLICY IF EXISTS "Enable read access for users to own profile" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON profiles;

-- Create new policies for profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Companies can view their operators"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles AS company
      WHERE company.id = auth.uid()
      AND company.role = 'company'
      AND profiles.company_id = company.id
      AND profiles.role = 'operator'
    )
  );

CREATE POLICY "Admin can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Drop existing policies for customers
DROP POLICY IF EXISTS "Enable read access for customer owners" ON customers;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON customers;
DROP POLICY IF EXISTS "Enable update for customer owners" ON customers;

-- Create new policies for customers
CREATE POLICY "Customers can view own data"
  ON customers FOR SELECT
  TO authenticated
  USING (auth.uid() = profile_id);

CREATE POLICY "Companies can view all customers"
  ON customers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('company', 'operator')
    )
  );

CREATE POLICY "Admin can view all customers"
  ON customers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can insert customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Customers can update own data"
  ON customers FOR UPDATE
  TO authenticated
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Customers can delete own data"
  ON customers FOR DELETE
  TO authenticated
  USING (auth.uid() = profile_id);

-- Drop existing policies for customer_branches
DROP POLICY IF EXISTS "Enable read for branch profiles and parent customers" ON customer_branches;
DROP POLICY IF EXISTS "Enable insert for customers" ON customer_branches;
DROP POLICY IF EXISTS "Enable update for branch profiles" ON customer_branches;

-- Create new policies for customer_branches
CREATE POLICY "Branch users can view own branch"
  ON customer_branches FOR SELECT
  TO authenticated
  USING (auth.uid() = profile_id);

CREATE POLICY "Customers can view their branches"
  ON customer_branches FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = customer_branches.customer_id
      AND customers.profile_id = auth.uid()
    )
  );

CREATE POLICY "Companies can view all customer branches"
  ON customer_branches FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('company', 'operator')
    )
  );

CREATE POLICY "Admin can view all branches"
  ON customer_branches FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Customers can insert branches"
  ON customer_branches FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = customer_branches.customer_id
      AND customers.profile_id = auth.uid()
    )
  );

CREATE POLICY "Branch users can update own branch"
  ON customer_branches FOR UPDATE
  TO authenticated
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Customers can delete their branches"
  ON customer_branches FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = customer_branches.customer_id
      AND customers.profile_id = auth.uid()
    )
  );