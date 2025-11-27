/*
  # Add currency column to materials and biocidal products tables

  1. Changes
    - Add `currency` column to `company_materials` table
    - Add `currency` column to `company_biocidal_products` table
    - Set default value to 'usd' for existing records
    - Make column nullable for flexibility

  2. Notes
    - Currency column will store currency codes (usd, eur, try, azn, sar, gbp)
    - Existing records will default to 'usd'
    - New records can specify any supported currency
*/

-- Add currency column to company_materials table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_materials' AND column_name = 'currency'
  ) THEN
    ALTER TABLE company_materials ADD COLUMN currency text DEFAULT 'usd';
  END IF;
END $$;

-- Add currency column to company_biocidal_products table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_biocidal_products' AND column_name = 'currency'
  ) THEN
    ALTER TABLE company_biocidal_products ADD COLUMN currency text DEFAULT 'usd';
  END IF;
END $$;