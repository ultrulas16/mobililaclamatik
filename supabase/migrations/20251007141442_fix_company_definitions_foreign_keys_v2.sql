/*
  # Fix Company Definitions Foreign Keys - Version 2

  1. Changes
    - Delete existing invalid records
    - Drop and recreate foreign key constraints to reference companies table
    - Update RLS policies to work with companies table
  
  2. Security
    - Maintains data integrity
    - Updates RLS policies for proper access control
*/

-- Delete any existing records with invalid company_ids
DELETE FROM company_visit_types WHERE company_id NOT IN (SELECT id FROM companies);
DELETE FROM company_target_pests WHERE company_id NOT IN (SELECT id FROM companies);

-- Fix company_visit_types foreign key
ALTER TABLE company_visit_types 
  DROP CONSTRAINT IF EXISTS company_visit_types_company_id_fkey;

ALTER TABLE company_visit_types 
  ADD CONSTRAINT company_visit_types_company_id_fkey 
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

-- Fix company_target_pests foreign key
ALTER TABLE company_target_pests 
  DROP CONSTRAINT IF EXISTS company_target_pests_company_id_fkey;

ALTER TABLE company_target_pests 
  ADD CONSTRAINT company_target_pests_company_id_fkey 
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

-- Update RLS policies for visit types to check against companies table
DROP POLICY IF EXISTS "Companies can view their visit types" ON company_visit_types;
DROP POLICY IF EXISTS "Companies can insert their visit types" ON company_visit_types;
DROP POLICY IF EXISTS "Companies can update their visit types" ON company_visit_types;
DROP POLICY IF EXISTS "Companies can delete their visit types" ON company_visit_types;

CREATE POLICY "Companies can view their visit types"
  ON company_visit_types
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Companies can insert their visit types"
  ON company_visit_types
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Companies can update their visit types"
  ON company_visit_types
  FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Companies can delete their visit types"
  ON company_visit_types
  FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );

-- Update RLS policies for target pests
DROP POLICY IF EXISTS "Companies can view their target pests" ON company_target_pests;
DROP POLICY IF EXISTS "Companies can insert their target pests" ON company_target_pests;
DROP POLICY IF EXISTS "Companies can update their target pests" ON company_target_pests;
DROP POLICY IF EXISTS "Companies can delete their target pests" ON company_target_pests;

CREATE POLICY "Companies can view their target pests"
  ON company_target_pests
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Companies can insert their target pests"
  ON company_target_pests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Companies can update their target pests"
  ON company_target_pests
  FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Companies can delete their target pests"
  ON company_target_pests
  FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );
