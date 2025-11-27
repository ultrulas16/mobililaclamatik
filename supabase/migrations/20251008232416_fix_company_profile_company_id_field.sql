/*
  # Fix Company Profile company_id Field

  1. Problem
    - Profiles table has company_id field set to NULL for company role users
    - This causes pricing page to not load any data because it checks for profile?.company_id

  2. Solution
    - Update all existing company profiles to have their company_id set
    - Match profile.id with companies.owner_id to find the correct company_id
    - This will allow company users to see their customers and branches in pricing page

  3. Changes
    - Update profiles.company_id for all company role users based on companies.owner_id
*/

-- Update company_id in profiles for company role users
UPDATE profiles p
SET company_id = c.id
FROM companies c
WHERE p.role = 'company'
  AND p.id = c.owner_id
  AND p.company_id IS NULL;
