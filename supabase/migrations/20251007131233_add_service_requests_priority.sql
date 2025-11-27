/*
  # Add Priority Column to Service Requests

  1. Changes
    - Add `priority` column to `service_requests` table
    - Default value: 'normal'
    - Valid values: 'low', 'normal', 'high', 'urgent'

  2. Notes
    - This allows operators to set priority when creating visits
    - Helps with visit scheduling and management
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_requests' AND column_name = 'priority'
  ) THEN
    ALTER TABLE service_requests
    ADD COLUMN priority text DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
  END IF;
END $$;
