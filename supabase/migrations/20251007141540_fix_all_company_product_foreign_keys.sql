/*
  # Fix All Company Product Foreign Keys

  1. Changes
    - Fix company_biocidal_products foreign key to reference companies
    - Fix paid_products foreign key to reference companies
    - Update RLS policies accordingly
  
  2. Security
    - Maintains proper access control
    - Ensures data integrity
*/

-- Delete invalid records
DELETE FROM company_biocidal_products WHERE company_id NOT IN (SELECT id FROM companies);
DELETE FROM paid_products WHERE company_id NOT IN (SELECT id FROM companies);

-- Fix company_biocidal_products foreign key
ALTER TABLE company_biocidal_products 
  DROP CONSTRAINT IF EXISTS company_biocidal_products_company_id_fkey;

ALTER TABLE company_biocidal_products 
  ADD CONSTRAINT company_biocidal_products_company_id_fkey 
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

-- Fix paid_products foreign key (if it references profiles)
ALTER TABLE paid_products 
  DROP CONSTRAINT IF EXISTS paid_products_company_id_fkey;

ALTER TABLE paid_products 
  ADD CONSTRAINT paid_products_company_id_fkey 
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

-- Update biocidal products RLS policies
DROP POLICY IF EXISTS "Companies can view their biocidal products" ON company_biocidal_products;
DROP POLICY IF EXISTS "Companies can insert their biocidal products" ON company_biocidal_products;
DROP POLICY IF EXISTS "Companies can update their biocidal products" ON company_biocidal_products;
DROP POLICY IF EXISTS "Companies can delete their biocidal products" ON company_biocidal_products;

CREATE POLICY "Companies can view their biocidal products"
  ON company_biocidal_products
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Companies can insert their biocidal products"
  ON company_biocidal_products
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Companies can update their biocidal products"
  ON company_biocidal_products
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

CREATE POLICY "Companies can delete their biocidal products"
  ON company_biocidal_products
  FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );

-- Update paid products RLS policies
DROP POLICY IF EXISTS "Company can manage their paid products" ON paid_products;

CREATE POLICY "Companies can view their paid products"
  ON paid_products
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Companies can insert their paid products"
  ON paid_products
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Companies can update their paid products"
  ON paid_products
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

CREATE POLICY "Companies can delete their paid products"
  ON paid_products
  FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );
