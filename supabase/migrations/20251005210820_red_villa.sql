/*
  # Admin Warehouse Management

  1. New Tables
    - `admin_warehouses` - Admin tarafından yönetilen şirket depoları
    - `admin_warehouse_items` - Admin depolarındaki ürün stokları
    
  2. Security
    - Enable RLS on new tables
    - Add policies for admin access
    - Add policies for company read access
    
  3. Functions
    - Create function to initialize company warehouse
    - Add trigger for automatic warehouse creation
*/

-- Admin Warehouses Table
CREATE TABLE IF NOT EXISTS admin_warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Şirket Ana Deposu',
  location text DEFAULT 'Merkez Ofis',
  warehouse_type text NOT NULL DEFAULT 'company_main',
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Admin Warehouse Items Table
CREATE TABLE IF NOT EXISTS admin_warehouse_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id uuid NOT NULL REFERENCES admin_warehouses(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES company_materials(id) ON DELETE CASCADE,
  quantity numeric DEFAULT 0 CHECK (quantity >= 0),
  min_quantity numeric DEFAULT 10 CHECK (min_quantity >= 0),
  max_quantity numeric DEFAULT 1000 CHECK (max_quantity >= min_quantity),
  unit_cost numeric DEFAULT 0 CHECK (unit_cost >= 0),
  total_value numeric GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  last_restocked_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(warehouse_id, product_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_warehouses_company_id ON admin_warehouses(company_id);
CREATE INDEX IF NOT EXISTS idx_admin_warehouses_type ON admin_warehouses(warehouse_type);
CREATE INDEX IF NOT EXISTS idx_admin_warehouse_items_warehouse_id ON admin_warehouse_items(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_admin_warehouse_items_product_id ON admin_warehouse_items(product_id);
CREATE INDEX IF NOT EXISTS idx_admin_warehouse_items_quantity ON admin_warehouse_items(quantity);

-- Enable RLS
ALTER TABLE admin_warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_warehouse_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_warehouses
CREATE POLICY "Admin can manage all warehouses"
  ON admin_warehouses
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Companies can view their warehouse"
  ON admin_warehouses
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT c.id FROM companies c 
      WHERE c.owner_id = auth.uid()
    )
  );

-- RLS Policies for admin_warehouse_items
CREATE POLICY "Admin can manage all warehouse items"
  ON admin_warehouse_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Companies can view their warehouse items"
  ON admin_warehouse_items
  FOR SELECT
  TO authenticated
  USING (
    warehouse_id IN (
      SELECT aw.id FROM admin_warehouses aw
      JOIN companies c ON aw.company_id = c.id
      WHERE c.owner_id = auth.uid()
    )
  );

-- Function to create warehouse for new companies
CREATE OR REPLACE FUNCTION create_company_warehouse()
RETURNS TRIGGER AS $$
BEGIN
  -- Create admin warehouse for the company
  INSERT INTO admin_warehouses (
    company_id,
    name,
    location,
    warehouse_type,
    created_by
  ) VALUES (
    NEW.id,
    NEW.name || ' Ana Deposu',
    'Merkez Ofis',
    'company_main',
    NEW.owner_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create warehouse when company is created
DROP TRIGGER IF EXISTS create_company_warehouse_trigger ON companies;
CREATE TRIGGER create_company_warehouse_trigger
  AFTER INSERT ON companies
  FOR EACH ROW
  EXECUTE FUNCTION create_company_warehouse();

-- Update trigger for admin_warehouse_items
CREATE OR REPLACE FUNCTION update_admin_warehouse_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_admin_warehouse_items_updated_at
  BEFORE UPDATE ON admin_warehouse_items
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_warehouse_items_updated_at();

-- Update trigger for admin_warehouses
CREATE OR REPLACE FUNCTION update_admin_warehouses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_admin_warehouses_updated_at
  BEFORE UPDATE ON admin_warehouses
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_warehouses_updated_at();