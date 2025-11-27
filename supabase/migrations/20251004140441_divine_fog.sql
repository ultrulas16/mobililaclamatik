/*
  # Company Definitions System

  1. New Tables
    - `company_materials` - Ücretli malzemeler (Paid materials used in visits)
    - `company_biocidal_products` - Biyosidal ürünler (Biocidal products)
    - `company_equipment` - Hizmete yardımcı ekipmanlar (Service equipment)

  2. Security
    - Enable RLS on all tables
    - Companies can only view/manage their own definitions
    - Each company has isolated data

  3. Features
    - Materials with pricing and units
    - Biocidal products with descriptions
    - Equipment with quantity tracking
    - Automatic timestamps
*/

-- Table: company_materials (Ücretli Malzemeler)
CREATE TABLE IF NOT EXISTS company_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  unit text, -- örn: 'kg', 'litre', 'adet'
  price numeric(10,2),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table: company_biocidal_products (Biyosidal Ürünler)
CREATE TABLE IF NOT EXISTS company_biocidal_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  active_ingredient text,
  concentration text,
  unit text, -- örn: 'litre', 'gram', 'ml'
  price numeric(10,2),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table: company_equipment (Hizmete Yardımcı Ekipmanlar)
CREATE TABLE IF NOT EXISTS company_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  equipment_type text, -- örn: 'spray', 'trap', 'detector'
  quantity integer DEFAULT 1,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE company_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_biocidal_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_equipment ENABLE ROW LEVEL SECURITY;

-- RLS Policies for company_materials
CREATE POLICY "Companies can view their materials"
  ON company_materials FOR SELECT
  TO authenticated
  USING (company_id = auth.uid());

CREATE POLICY "Companies can insert their materials"
  ON company_materials FOR INSERT
  TO authenticated
  WITH CHECK (company_id = auth.uid());

CREATE POLICY "Companies can update their materials"
  ON company_materials FOR UPDATE
  TO authenticated
  USING (company_id = auth.uid())
  WITH CHECK (company_id = auth.uid());

CREATE POLICY "Companies can delete their materials"
  ON company_materials FOR DELETE
  TO authenticated
  USING (company_id = auth.uid());

-- RLS Policies for company_biocidal_products
CREATE POLICY "Companies can view their biocidal products"
  ON company_biocidal_products FOR SELECT
  TO authenticated
  USING (company_id = auth.uid());

CREATE POLICY "Companies can insert their biocidal products"
  ON company_biocidal_products FOR INSERT
  TO authenticated
  WITH CHECK (company_id = auth.uid());

CREATE POLICY "Companies can update their biocidal products"
  ON company_biocidal_products FOR UPDATE
  TO authenticated
  USING (company_id = auth.uid())
  WITH CHECK (company_id = auth.uid());

CREATE POLICY "Companies can delete their biocidal products"
  ON company_biocidal_products FOR DELETE
  TO authenticated
  USING (company_id = auth.uid());

-- RLS Policies for company_equipment
CREATE POLICY "Companies can view their equipment"
  ON company_equipment FOR SELECT
  TO authenticated
  USING (company_id = auth.uid());

CREATE POLICY "Companies can insert their equipment"
  ON company_equipment FOR INSERT
  TO authenticated
  WITH CHECK (company_id = auth.uid());

CREATE POLICY "Companies can update their equipment"
  ON company_equipment FOR UPDATE
  TO authenticated
  USING (company_id = auth.uid())
  WITH CHECK (company_id = auth.uid());

CREATE POLICY "Companies can delete their equipment"
  ON company_equipment FOR DELETE
  TO authenticated
  USING (company_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_company_materials_company_id ON company_materials(company_id);
CREATE INDEX IF NOT EXISTS idx_company_materials_is_active ON company_materials(is_active);
CREATE INDEX IF NOT EXISTS idx_company_biocidal_products_company_id ON company_biocidal_products(company_id);
CREATE INDEX IF NOT EXISTS idx_company_biocidal_products_is_active ON company_biocidal_products(is_active);
CREATE INDEX IF NOT EXISTS idx_company_equipment_company_id ON company_equipment(company_id);
CREATE INDEX IF NOT EXISTS idx_company_equipment_is_active ON company_equipment(is_active);

-- Add updated_at triggers for all tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_company_materials_updated_at ON company_materials;
CREATE TRIGGER update_company_materials_updated_at
  BEFORE UPDATE ON company_materials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_company_biocidal_products_updated_at ON company_biocidal_products;
CREATE TRIGGER update_company_biocidal_products_updated_at
  BEFORE UPDATE ON company_biocidal_products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_company_equipment_updated_at ON company_equipment;
CREATE TRIGGER update_company_equipment_updated_at
  BEFORE UPDATE ON company_equipment
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();