/*
  # Fix Registration Policies

  ## Changes
  1. Add policy to allow users to insert their own profile during registration
  2. Update companies policies to allow new users to create their company

  ## Security
  - Users can only insert their own profile (matching auth.uid())
  - Company owners can create companies
*/

-- Drop existing restrictive insert policy if exists
DROP POLICY IF EXISTS "Admin can insert profiles" ON profiles;

-- Allow users to insert their own profile during registration
CREATE POLICY "Users can insert own profile during registration"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow authenticated users to create companies (for company role users)
DROP POLICY IF EXISTS "Admin can insert companies" ON companies;

CREATE POLICY "Authenticated users can insert companies"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);
