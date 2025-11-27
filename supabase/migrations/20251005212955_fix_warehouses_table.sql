/*
  # Fix Warehouses Table Schema
  
  1. New Tables
    - `warehouses` - Operator and company warehouse management
      - `id` (uuid, primary key)
      - `name` (text, warehouse name)
      - `warehouse_type` (text, type: 'main', 'operator', etc.)
      - `company_id` (uuid, reference to profiles)
      - `operator_id` (uuid, nullable reference to profiles)
      - `location` (text, warehouse location)
      - `is_active` (boolean, default true)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      
  2. Security
    - Enable RLS on warehouses table
    - Companies can view/manage their warehouses
    - Operators can view their assigned warehouses
    
  3. Features
    - Support for both main company warehouses and operator warehouses
    - operator_id is nullable to allow company-level warehouses
    - Automatic timestamps
*/

-- Create warehouses table
CREATE TABLE IF NOT EXISTS warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  warehouse_type text NOT NULL DEFAULT 'main',
  company_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  operator_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  location text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create warehouse_items table for inventory
CREATE TABLE IF NOT EXISTS warehouse_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES company_materials(id) ON DELETE CASCADE,
  quantity numeric DEFAULT 0 CHECK (quantity >= 0),
  min_quantity numeric DEFAULT 10 CHECK (min_quantity >= 0),
  unit_cost numeric DEFAULT 0 CHECK (unit_cost >= 0),
  last_restocked_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(warehouse_id, product_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_warehouses_company_id ON warehouses(company_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_operator_id ON warehouses(operator_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_type ON warehouses(warehouse_type);
CREATE INDEX IF NOT EXISTS idx_warehouse_items_warehouse_id ON warehouse_items(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_items_product_id ON warehouse_items(product_id);

-- Enable RLS
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for warehouses
CREATE POLICY "Companies can view their warehouses"
  ON warehouses FOR SELECT
  TO authenticated
  USING (company_id = auth.uid());

CREATE POLICY "Companies can insert their warehouses"
  ON warehouses FOR INSERT
  TO authenticated
  WITH CHECK (company_id = auth.uid());

CREATE POLICY "Companies can update their warehouses"
  ON warehouses FOR UPDATE
  TO authenticated
  USING (company_id = auth.uid())
  WITH CHECK (company_id = auth.uid());

CREATE POLICY "Companies can delete their warehouses"
  ON warehouses FOR DELETE
  TO authenticated
  USING (company_id = auth.uid());

CREATE POLICY "Operators can view their assigned warehouse"
  ON warehouses FOR SELECT
  TO authenticated
  USING (operator_id = auth.uid());

-- RLS Policies for warehouse_items
CREATE POLICY "Companies can view their warehouse items"
  ON warehouse_items FOR SELECT
  TO authenticated
  USING (
    warehouse_id IN (
      SELECT id FROM warehouses WHERE company_id = auth.uid()
    )
  );

CREATE POLICY "Companies can insert warehouse items"
  ON warehouse_items FOR INSERT
  TO authenticated
  WITH CHECK (
    warehouse_id IN (
      SELECT id FROM warehouses WHERE company_id = auth.uid()
    )
  );

CREATE POLICY "Companies can update warehouse items"
  ON warehouse_items FOR UPDATE
  TO authenticated
  USING (
    warehouse_id IN (
      SELECT id FROM warehouses WHERE company_id = auth.uid()
    )
  )
  WITH CHECK (
    warehouse_id IN (
      SELECT id FROM warehouses WHERE company_id = auth.uid()
    )
  );

CREATE POLICY "Companies can delete warehouse items"
  ON warehouse_items FOR DELETE
  TO authenticated
  USING (
    warehouse_id IN (
      SELECT id FROM warehouses WHERE company_id = auth.uid()
    )
  );

CREATE POLICY "Operators can view their warehouse items"
  ON warehouse_items FOR SELECT
  TO authenticated
  USING (
    warehouse_id IN (
      SELECT id FROM warehouses WHERE operator_id = auth.uid()
    )
  );

-- Update trigger for warehouses
CREATE OR REPLACE FUNCTION update_warehouses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_warehouses_updated_at ON warehouses;
CREATE TRIGGER update_warehouses_updated_at
  BEFORE UPDATE ON warehouses
  FOR EACH ROW
  EXECUTE FUNCTION update_warehouses_updated_at();

-- Update trigger for warehouse_items
CREATE OR REPLACE FUNCTION update_warehouse_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_warehouse_items_updated_at ON warehouse_items;
CREATE TRIGGER update_warehouse_items_updated_at
  BEFORE UPDATE ON warehouse_items
  FOR EACH ROW
  EXECUTE FUNCTION update_warehouse_items_updated_at();
