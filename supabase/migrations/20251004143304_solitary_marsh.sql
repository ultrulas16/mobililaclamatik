/*
  # Add Company Settings Columns

  1. New Columns
    - Add tax_number column to companies table
    - Add tax_office column to companies table  
    - Add logo_url column to companies table
    - Add updated_at trigger for companies table

  2. Security
    - Maintain existing RLS policies
    - No changes to permissions needed
*/

-- Add new columns to companies table
DO $$
BEGIN
  -- Add tax_number column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'tax_number'
  ) THEN
    ALTER TABLE companies ADD COLUMN tax_number text;
  END IF;

  -- Add tax_office column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'tax_office'
  ) THEN
    ALTER TABLE companies ADD COLUMN tax_office text;
  END IF;

  -- Add logo_url column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE companies ADD COLUMN logo_url text;
  END IF;
END $$;

-- Add updated_at trigger for companies table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'update_companies_updated_at'
  ) THEN
    CREATE TRIGGER update_companies_updated_at
      BEFORE UPDATE ON companies
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;