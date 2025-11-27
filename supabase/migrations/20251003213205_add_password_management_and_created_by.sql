/*
  # Add Password Management and Created By Tracking

  ## Changes
  
  1. New Tables
    - `user_passwords` - Stores encrypted passwords for company-created users
      - `id` (uuid, primary key)
      - `profile_id` (uuid, references profiles)
      - `encrypted_password` (text) - Base64 encoded password
      - `created_by` (uuid, references profiles) - Company that created this user
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Modified Tables
    - `customers` - Add created_by_company_id field
    - `customer_branches` - Add created_by_company_id field
    - `operators` - Already has company_id which serves as created_by
  
  3. Security
    - Enable RLS on user_passwords table
    - Add policy for companies to view/manage their created users' passwords
    - Add policies for tracking who created what
*/

-- Create user_passwords table
CREATE TABLE IF NOT EXISTS user_passwords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  encrypted_password text NOT NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(profile_id)
);

-- Add created_by to customers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'created_by_company_id'
  ) THEN
    ALTER TABLE customers ADD COLUMN created_by_company_id uuid REFERENCES profiles(id);
  END IF;
END $$;

-- Add created_by to customer_branches table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customer_branches' AND column_name = 'created_by_company_id'
  ) THEN
    ALTER TABLE customer_branches ADD COLUMN created_by_company_id uuid REFERENCES profiles(id);
  END IF;
END $$;

-- Enable RLS on user_passwords
ALTER TABLE user_passwords ENABLE ROW LEVEL SECURITY;

-- Companies can view passwords of users they created
CREATE POLICY "Companies can view their created users passwords"
  ON user_passwords
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
  );

-- Companies can insert passwords for users they create
CREATE POLICY "Companies can insert passwords for their users"
  ON user_passwords
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
  );

-- Companies can update passwords of users they created
CREATE POLICY "Companies can update their created users passwords"
  ON user_passwords
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
  )
  WITH CHECK (
    created_by = auth.uid()
  );

-- Companies can delete passwords of users they created
CREATE POLICY "Companies can delete their created users passwords"
  ON user_passwords
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
  );

-- Update customers policies to include created_by check
CREATE POLICY "Companies can update their created customers"
  ON customers
  FOR UPDATE
  TO authenticated
  USING (
    created_by_company_id = auth.uid()
  )
  WITH CHECK (
    created_by_company_id = auth.uid()
  );

CREATE POLICY "Companies can delete their created customers"
  ON customers
  FOR DELETE
  TO authenticated
  USING (
    created_by_company_id = auth.uid()
  );

-- Update customer_branches policies
CREATE POLICY "Companies can update their created branches"
  ON customer_branches
  FOR UPDATE
  TO authenticated
  USING (
    created_by_company_id = auth.uid()
  )
  WITH CHECK (
    created_by_company_id = auth.uid()
  );

CREATE POLICY "Companies can delete their created branches"
  ON customer_branches
  FOR DELETE
  TO authenticated
  USING (
    created_by_company_id = auth.uid()
  );

-- Add policies for operators (using company_id as created_by)
CREATE POLICY "Companies can update their operators"
  ON operators
  FOR UPDATE
  TO authenticated
  USING (
    company_id = auth.uid()
  )
  WITH CHECK (
    company_id = auth.uid()
  );

CREATE POLICY "Companies can delete their operators"
  ON operators
  FOR DELETE
  TO authenticated
  USING (
    company_id = auth.uid()
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for user_passwords
DROP TRIGGER IF EXISTS update_user_passwords_updated_at ON user_passwords;
CREATE TRIGGER update_user_passwords_updated_at
  BEFORE UPDATE ON user_passwords
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
