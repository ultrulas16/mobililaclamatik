/*
  # Add Company Warehouse Management Permissions

  1. Problem
    - Companies can only view their warehouses and items (SELECT)
    - Companies cannot insert, update, or delete warehouse items
    - This prevents them from managing their warehouse inventory

  2. Solution
    - Add INSERT policy for admin_warehouses (companies can create their warehouse)
    - Add UPDATE policy for admin_warehouses (companies can update their warehouse)
    - Add INSERT policy for admin_warehouse_items (companies can add items)
    - Add UPDATE policy for admin_warehouse_items (companies can update items)
    - Add DELETE policy for admin_warehouse_items (companies can delete items)

  3. Security
    - Companies can only manage their own warehouses
    - Companies can only manage items in their own warehouses
    - All policies check ownership through companies table
*/

-- ============================================================================
-- ADMIN_WAREHOUSES POLICIES
-- ============================================================================

-- Companies can insert their own warehouse
CREATE POLICY "Companies can create their warehouse"
  ON admin_warehouses FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT c.id
      FROM companies c
      WHERE c.owner_id = auth.uid()
    )
  );

-- Companies can update their own warehouse
CREATE POLICY "Companies can update their warehouse"
  ON admin_warehouses FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT c.id
      FROM companies c
      WHERE c.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT c.id
      FROM companies c
      WHERE c.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- ADMIN_WAREHOUSE_ITEMS POLICIES
-- ============================================================================

-- Companies can insert items to their warehouse
CREATE POLICY "Companies can add items to their warehouse"
  ON admin_warehouse_items FOR INSERT
  TO authenticated
  WITH CHECK (
    warehouse_id IN (
      SELECT aw.id
      FROM admin_warehouses aw
      JOIN companies c ON aw.company_id = c.id
      WHERE c.owner_id = auth.uid()
    )
  );

-- Companies can update items in their warehouse
CREATE POLICY "Companies can update their warehouse items"
  ON admin_warehouse_items FOR UPDATE
  TO authenticated
  USING (
    warehouse_id IN (
      SELECT aw.id
      FROM admin_warehouses aw
      JOIN companies c ON aw.company_id = c.id
      WHERE c.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    warehouse_id IN (
      SELECT aw.id
      FROM admin_warehouses aw
      JOIN companies c ON aw.company_id = c.id
      WHERE c.owner_id = auth.uid()
    )
  );

-- Companies can delete items from their warehouse
CREATE POLICY "Companies can delete their warehouse items"
  ON admin_warehouse_items FOR DELETE
  TO authenticated
  USING (
    warehouse_id IN (
      SELECT aw.id
      FROM admin_warehouses aw
      JOIN companies c ON aw.company_id = c.id
      WHERE c.owner_id = auth.uid()
    )
  );