/*
  # Fix Missing Company Owner Relationships

  1. Problem
    - Some company role profiles don't have company_id set
    - Some companies exist but have NULL owner_id
    - This breaks the pricing page and other company features

  2. Solution
    - Update companies table to set owner_id for orphaned companies
    - Match by email address between profiles and companies
    - Create missing companies for profiles without one
    - Update profiles.company_id for all company users

  3. Changes
    - Set owner_id in companies table where it's NULL (match by email)
    - Create companies for company profiles that don't have one
    - Update company_id in profiles for all company role users
*/

-- Step 1: Update owner_id in companies table for orphaned companies (match by email)
UPDATE companies c
SET owner_id = p.id
FROM profiles p
WHERE c.owner_id IS NULL
  AND c.email IS NOT NULL
  AND c.email = p.email
  AND p.role = 'company';

-- Step 2: Create missing companies for company profiles without one
DO $$
DECLARE
  profile_record RECORD;
  new_company_id UUID;
BEGIN
  FOR profile_record IN 
    SELECT p.id, p.email, p.company_name
    FROM profiles p
    LEFT JOIN companies c ON c.owner_id = p.id
    WHERE p.role = 'company' 
      AND c.id IS NULL
  LOOP
    -- Insert company
    INSERT INTO companies (name, owner_id, email, phone, address, currency)
    VALUES (
      profile_record.company_name,
      profile_record.id,
      profile_record.email,
      '',
      '',
      'TRY'
    )
    RETURNING id INTO new_company_id;
    
    -- Update profile with company_id
    UPDATE profiles
    SET company_id = new_company_id
    WHERE id = profile_record.id;
    
    RAISE NOTICE 'Created company for profile: %', profile_record.email;
  END LOOP;
END $$;

-- Step 3: Update company_id in profiles for all company role users (in case some are still missing)
UPDATE profiles p
SET company_id = c.id
FROM companies c
WHERE p.role = 'company'
  AND p.id = c.owner_id
  AND (p.company_id IS NULL OR p.company_id != c.id);
