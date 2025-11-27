/*
  # Create Operators Table

  1. New Table: operators
    - `id` (uuid, primary key)
    - `profile_id` (uuid, references profiles.id) - Link to auth user
    - `company_id` (uuid, references profiles.id) - Link to pest control company
    - `full_name` (text, not null)
    - `email` (text, not null, unique)
    - `phone` (text)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Companies can view their own operators
    - Operators can view their own data
    - Companies can insert/update/delete their operators

  3. Purpose
    - Track operators created by pest control companies
    - Maintain company-operator relationships
    - Allow companies to manage their operators
*/

-- Create operators table
CREATE TABLE IF NOT EXISTS operators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  company_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE operators ENABLE ROW LEVEL SECURITY;

-- Policy: Operators can view their own data
CREATE POLICY "Operators view own data"
  ON operators FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

-- Policy: Companies can view their operators
CREATE POLICY "Companies view their operators"
  ON operators FOR SELECT
  TO authenticated
  USING (company_id = auth.uid());

-- Policy: Companies can insert operators
CREATE POLICY "Companies insert operators"
  ON operators FOR INSERT
  TO authenticated
  WITH CHECK (company_id = auth.uid());

-- Policy: Companies can update their operators
CREATE POLICY "Companies update their operators"
  ON operators FOR UPDATE
  TO authenticated
  USING (company_id = auth.uid())
  WITH CHECK (company_id = auth.uid());

-- Policy: Companies can delete their operators
CREATE POLICY "Companies delete their operators"
  ON operators FOR DELETE
  TO authenticated
  USING (company_id = auth.uid());

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_operators_company_id ON operators(company_id);
CREATE INDEX IF NOT EXISTS idx_operators_profile_id ON operators(profile_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_operators_updated_at ON operators;
CREATE TRIGGER update_operators_updated_at
  BEFORE UPDATE ON operators
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();