/*
  # Add Currency to Companies
  
  1. Changes
    - Add currency column to companies table
    - Add currency column to profiles table for company users
    - Set default currency as TRY (Turkish Lira)
  
  2. Security
    - Companies can update their own currency
*/

-- Add currency to companies table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' AND column_name = 'currency'
  ) THEN
    ALTER TABLE companies ADD COLUMN currency text NOT NULL DEFAULT 'TRY' CHECK (currency IN ('TRY', 'USD', 'EUR', 'GBP'));
  END IF;
END $$;

-- Add currency to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'currency'
  ) THEN
    ALTER TABLE profiles ADD COLUMN currency text NOT NULL DEFAULT 'TRY' CHECK (currency IN ('TRY', 'USD', 'EUR', 'GBP'));
  END IF;
END $$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_companies_currency ON companies(currency);
CREATE INDEX IF NOT EXISTS idx_profiles_currency ON profiles(currency);

-- Add comment
COMMENT ON COLUMN companies.currency IS 'Company currency for pricing and financial operations';
COMMENT ON COLUMN profiles.currency IS 'User currency preference for pricing display';
