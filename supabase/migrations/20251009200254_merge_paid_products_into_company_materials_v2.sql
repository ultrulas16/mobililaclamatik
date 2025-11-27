/*
  # Merge paid_products into company_materials (v2)

  1. Overview
    - paid_products and company_materials represent the same concept
    - Consolidating into a single table: company_materials
    
  2. Changes
    - Drop foreign key constraint first
    - Update existing data to use company IDs
    - Add correct foreign key constraint
    - Migrate paid_products data
    - Update related tables
    
  3. Security
    - Update RLS policies
*/

-- Step 1: Drop old foreign key constraint
ALTER TABLE company_materials 
DROP CONSTRAINT IF EXISTS company_materials_company_id_fkey;

-- Step 2: Update existing company_materials records to use company IDs
UPDATE company_materials
SET company_id = c.id
FROM companies c
WHERE c.owner_id = company_materials.company_id;

-- Step 3: Add correct foreign key constraint
ALTER TABLE company_materials
ADD CONSTRAINT company_materials_company_id_fkey 
FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

-- Step 4: Ensure company_materials has all necessary columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_materials' AND column_name = 'currency'
  ) THEN
    ALTER TABLE company_materials ADD COLUMN currency text DEFAULT 'TRY';
  END IF;
END $$;

-- Step 5: Migrate data from paid_products to company_materials
INSERT INTO company_materials (
  id,
  company_id,
  name,
  description,
  unit,
  price,
  is_active,
  created_at,
  updated_at,
  currency
)
SELECT 
  id,
  company_id,
  name,
  NULL as description,
  unit_type as unit,
  price,
  is_active,
  created_at,
  updated_at,
  'TRY' as currency
FROM paid_products
ON CONFLICT (id) DO NOTHING;

-- Step 6: Update RLS policies for company_materials
DROP POLICY IF EXISTS "Companies can view their materials" ON company_materials;
CREATE POLICY "Companies can view their materials"
  ON company_materials FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Companies can insert their materials" ON company_materials;
CREATE POLICY "Companies can insert their materials"
  ON company_materials FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Companies can update their materials" ON company_materials;
CREATE POLICY "Companies can update their materials"
  ON company_materials FOR UPDATE
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

DROP POLICY IF EXISTS "Companies can delete their materials" ON company_materials;
CREATE POLICY "Companies can delete their materials"
  ON company_materials FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Operators can view company materials" ON company_materials;
CREATE POLICY "Operators can view company materials"
  ON company_materials FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM operators WHERE profile_id = auth.uid()
    )
  );

-- Step 7: Update visit_paid_products table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'visit_paid_products'
  ) THEN
    ALTER TABLE visit_paid_products 
    DROP CONSTRAINT IF EXISTS visit_paid_products_product_id_fkey;
    
    ALTER TABLE visit_paid_products 
    RENAME COLUMN product_id TO material_id;
    
    ALTER TABLE visit_paid_products 
    ADD CONSTRAINT visit_paid_products_material_id_fkey 
    FOREIGN KEY (material_id) REFERENCES company_materials(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 8: Update warehouse_inventory
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'warehouse_inventory' AND column_name = 'product_id'
  ) THEN
    ALTER TABLE warehouse_inventory 
    DROP CONSTRAINT IF EXISTS warehouse_inventory_product_id_fkey;
    
    ALTER TABLE warehouse_inventory 
    RENAME COLUMN product_id TO material_id;
    
    ALTER TABLE warehouse_inventory 
    ADD CONSTRAINT warehouse_inventory_material_id_fkey 
    FOREIGN KEY (material_id) REFERENCES company_materials(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 9: Update transfer_requests
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transfer_requests' AND column_name = 'product_id'
  ) THEN
    ALTER TABLE transfer_requests 
    DROP CONSTRAINT IF EXISTS transfer_requests_product_id_fkey;
    
    ALTER TABLE transfer_requests 
    RENAME COLUMN product_id TO material_id;
    
    ALTER TABLE transfer_requests 
    ADD CONSTRAINT transfer_requests_material_id_fkey 
    FOREIGN KEY (material_id) REFERENCES company_materials(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 10: Drop the paid_products table
DROP TABLE IF EXISTS paid_products CASCADE;
