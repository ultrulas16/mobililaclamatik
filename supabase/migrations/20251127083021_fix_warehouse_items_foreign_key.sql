/*
  # Fix warehouse_items product_id foreign key

  1. Changes
    - Add foreign key constraint from warehouse_items.product_id to company_materials.id
    - This ensures data integrity and enables proper joins in queries

  2. Security
    - No RLS changes needed
*/

-- Add foreign key constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'warehouse_items_product_id_fkey'
    AND table_name = 'warehouse_items'
  ) THEN
    ALTER TABLE warehouse_items 
    ADD CONSTRAINT warehouse_items_product_id_fkey 
    FOREIGN KEY (product_id) 
    REFERENCES company_materials(id) 
    ON DELETE CASCADE;
  END IF;
END $$;
