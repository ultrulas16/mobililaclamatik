/*
  # Add GPS Coordinates for Location Tracking
  
  ## Overview
  Adds latitude and longitude columns to customer_branches and customers tables
  for distance calculation and location tracking.
  
  ## Changes
  1. Add latitude and longitude to customer_branches
  2. Add latitude and longitude to customers
  3. Create indexes for geospatial queries
  
  ## Important Notes
  - Latitude range: -90 to 90
  - Longitude range: -180 to 180
  - Used for distance calculations between visits
*/

-- Add GPS coordinates to customer_branches if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customer_branches' AND column_name = 'latitude'
  ) THEN
    ALTER TABLE customer_branches ADD COLUMN latitude numeric;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customer_branches' AND column_name = 'longitude'
  ) THEN
    ALTER TABLE customer_branches ADD COLUMN longitude numeric;
  END IF;
END $$;

-- Add GPS coordinates to customers if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'latitude'
  ) THEN
    ALTER TABLE customers ADD COLUMN latitude numeric;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'longitude'
  ) THEN
    ALTER TABLE customers ADD COLUMN longitude numeric;
  END IF;
END $$;

-- Create indexes for better geospatial query performance
CREATE INDEX IF NOT EXISTS idx_customer_branches_coordinates 
  ON customer_branches(latitude, longitude) 
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customers_coordinates 
  ON customers(latitude, longitude) 
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add check constraints to ensure valid coordinate ranges
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'customer_branches_latitude_check'
  ) THEN
    ALTER TABLE customer_branches 
      ADD CONSTRAINT customer_branches_latitude_check 
      CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'customer_branches_longitude_check'
  ) THEN
    ALTER TABLE customer_branches 
      ADD CONSTRAINT customer_branches_longitude_check 
      CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'customers_latitude_check'
  ) THEN
    ALTER TABLE customers 
      ADD CONSTRAINT customers_latitude_check 
      CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'customers_longitude_check'
  ) THEN
    ALTER TABLE customers 
      ADD CONSTRAINT customers_longitude_check 
      CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));
  END IF;
END $$;
