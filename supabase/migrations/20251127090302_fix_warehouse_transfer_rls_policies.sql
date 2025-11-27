/*
  # Fix Warehouse Transfer RLS Policies

  1. Changes
    - Fixes company role access to warehouse transfers
    - Adds policy for companies to create transfers for their operators
    - Simplifies approval policies
    - Ensures proper access control

  2. Security
    - Companies can only manage transfers for their own warehouses
    - Operators can only request transfers to their own warehouses
    - All policies check proper ownership
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Company admins can approve transfers" ON warehouse_transfers;
DROP POLICY IF EXISTS "Company admins can view all transfers" ON warehouse_transfers;

-- Create new policies for company role

-- Companies can view transfers from their main warehouse
CREATE POLICY "Companies can view their warehouse transfers"
  ON warehouse_transfers
  FOR SELECT
  TO authenticated
  USING (
    -- Transfer from company's warehouse
    EXISTS (
      SELECT 1 FROM admin_warehouses aw
      WHERE aw.id = warehouse_transfers.from_warehouse_id
        AND aw.company_id IN (
          SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    )
    OR
    -- Transfer to company's operator warehouse
    EXISTS (
      SELECT 1 FROM warehouses w
      JOIN operators o ON o.id = w.operator_id
      WHERE w.id = warehouse_transfers.to_warehouse_id
        AND o.company_id IN (
          SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    )
  );

-- Companies can create transfers for their operators
CREATE POLICY "Companies can create transfers for operators"
  ON warehouse_transfers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User must be company role
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'company'
        AND company_id IS NOT NULL
    )
    AND
    -- From warehouse must be company's admin warehouse
    EXISTS (
      SELECT 1 FROM admin_warehouses aw
      WHERE aw.id = warehouse_transfers.from_warehouse_id
        AND aw.company_id IN (
          SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    )
    AND
    -- To warehouse must be one of company's operator warehouses
    EXISTS (
      SELECT 1 FROM warehouses w
      JOIN operators o ON o.id = w.operator_id
      WHERE w.id = warehouse_transfers.to_warehouse_id
        AND o.company_id IN (
          SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    )
  );

-- Companies can update (approve/reject) transfers
CREATE POLICY "Companies can manage transfer status"
  ON warehouse_transfers
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_warehouses aw
      WHERE aw.id = warehouse_transfers.from_warehouse_id
        AND aw.company_id IN (
          SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_warehouses aw
      WHERE aw.id = warehouse_transfers.from_warehouse_id
        AND aw.company_id IN (
          SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    )
  );

-- Add policy for warehouse_items access by companies
DROP POLICY IF EXISTS "Companies can view their warehouse items" ON warehouse_items;
DROP POLICY IF EXISTS "Companies can manage their warehouse items" ON warehouse_items;

CREATE POLICY "Companies can view their warehouse items"
  ON warehouse_items
  FOR SELECT
  TO authenticated
  USING (
    -- Company's operator warehouses
    EXISTS (
      SELECT 1 FROM warehouses w
      JOIN operators o ON o.id = w.operator_id
      WHERE w.id = warehouse_items.warehouse_id
        AND o.company_id IN (
          SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    )
  );

CREATE POLICY "Companies can manage their warehouse items"
  ON warehouse_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM warehouses w
      JOIN operators o ON o.id = w.operator_id
      WHERE w.id = warehouse_items.warehouse_id
        AND o.company_id IN (
          SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM warehouses w
      JOIN operators o ON o.id = w.operator_id
      WHERE w.id = warehouse_items.warehouse_id
        AND o.company_id IN (
          SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    )
  );
