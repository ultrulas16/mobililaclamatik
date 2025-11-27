/*
  # Add operator access policies for company definitions

  1. New Policies
    - Allow operators to view their company's visit types
    - Allow operators to view their company's target pests
    - Allow operators to view their company's materials
    - Allow operators to view their company's biocidal products
    - Allow operators to view their company's equipment

  2. Security
    - Operators can only view data from their own company
    - Based on company_id relationship through operators table
*/

-- Allow operators to view their company's visit types
CREATE POLICY "Operators can view company visit types"
  ON company_visit_types
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT o.company_id
      FROM operators o
      WHERE o.profile_id = auth.uid()
    )
  );

-- Allow operators to view their company's target pests
CREATE POLICY "Operators can view company target pests"
  ON company_target_pests
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT o.company_id
      FROM operators o
      WHERE o.profile_id = auth.uid()
    )
  );

-- Allow operators to view their company's materials
CREATE POLICY "Operators can view company materials"
  ON company_materials
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT o.company_id
      FROM operators o
      WHERE o.profile_id = auth.uid()
    )
  );

-- Allow operators to view their company's biocidal products
CREATE POLICY "Operators can view company biocidal products"
  ON company_biocidal_products
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT o.company_id
      FROM operators o
      WHERE o.profile_id = auth.uid()
    )
  );

-- Allow operators to view their company's equipment
CREATE POLICY "Operators can view company equipment"
  ON company_equipment
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT o.company_id
      FROM operators o
      WHERE o.profile_id = auth.uid()
    )
  );