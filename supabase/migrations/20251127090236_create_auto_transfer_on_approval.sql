/*
  # Auto Transfer on Approval System

  1. Changes
    - Creates a trigger function to automatically transfer inventory when a transfer is approved
    - Automatically deducts from source warehouse
    - Automatically adds to destination warehouse
    - Creates warehouse_items entry if it doesn't exist

  2. Security
    - Trigger runs with elevated privileges
    - Updates are logged with timestamps
    - Stock checks are performed automatically

  3. Business Logic
    - When transfer status changes from 'pending' to 'approved' or 'completed'
    - Source warehouse stock is reduced
    - Destination warehouse stock is increased
    - If destination doesn't have the product, creates new entry
*/

-- Create function to handle automatic inventory transfer
CREATE OR REPLACE FUNCTION handle_warehouse_transfer_approval()
RETURNS TRIGGER AS $$
DECLARE
  v_source_item_id uuid;
  v_source_quantity numeric;
  v_dest_item_id uuid;
  v_dest_quantity numeric;
BEGIN
  -- Only proceed if status changed to approved or completed
  IF (NEW.status IN ('approved', 'completed') AND 
      OLD.status = 'pending') THEN
    
    -- Get source warehouse item
    SELECT id, quantity 
    INTO v_source_item_id, v_source_quantity
    FROM warehouse_items
    WHERE warehouse_id = NEW.from_warehouse_id
      AND product_id = NEW.product_id;

    -- Check if source item exists
    IF v_source_item_id IS NULL THEN
      RAISE EXCEPTION 'Kaynak depoda bu ürün bulunamadı';
    END IF;

    -- Check if enough stock exists
    IF v_source_quantity < NEW.quantity THEN
      RAISE EXCEPTION 'Kaynak depoda yeterli stok yok. Mevcut: %, İstenen: %', 
        v_source_quantity, NEW.quantity;
    END IF;

    -- Deduct from source warehouse
    UPDATE warehouse_items
    SET 
      quantity = quantity - NEW.quantity,
      updated_at = now()
    WHERE id = v_source_item_id;

    -- Check if destination warehouse has this product
    SELECT id, quantity
    INTO v_dest_item_id, v_dest_quantity
    FROM warehouse_items
    WHERE warehouse_id = NEW.to_warehouse_id
      AND product_id = NEW.product_id;

    -- Add to destination warehouse
    IF v_dest_item_id IS NULL THEN
      -- Create new entry
      INSERT INTO warehouse_items (
        warehouse_id,
        product_id,
        quantity,
        updated_at
      ) VALUES (
        NEW.to_warehouse_id,
        NEW.product_id,
        NEW.quantity,
        now()
      );
    ELSE
      -- Update existing entry
      UPDATE warehouse_items
      SET 
        quantity = quantity + NEW.quantity,
        updated_at = now()
      WHERE id = v_dest_item_id;
    END IF;

    -- Mark transfer as completed if it was approved
    IF NEW.status = 'approved' THEN
      NEW.status := 'completed';
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_warehouse_transfer_approval ON warehouse_transfers;

-- Create trigger
CREATE TRIGGER on_warehouse_transfer_approval
  BEFORE UPDATE ON warehouse_transfers
  FOR EACH ROW
  EXECUTE FUNCTION handle_warehouse_transfer_approval();
