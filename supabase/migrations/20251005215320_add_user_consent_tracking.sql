/*
  # Add User Consent Tracking

  1. New Columns
    - Add `accepted_privacy_policy` to profiles table
    - Add `accepted_terms_of_service` to profiles table
    - Add `privacy_policy_accepted_at` timestamp
    - Add `terms_of_service_accepted_at` timestamp

  2. Purpose
    - Track user consent for KVKK/GDPR compliance
    - Required for Google Play Store submission
    - Store timestamps for legal audit trail

  3. Notes
    - All new users must accept both documents during registration
    - Existing users will have NULL values (can be prompted on next login)
    - Timestamps record when consent was given
*/

-- Add consent tracking columns to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'accepted_privacy_policy'
  ) THEN
    ALTER TABLE profiles ADD COLUMN accepted_privacy_policy boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'accepted_terms_of_service'
  ) THEN
    ALTER TABLE profiles ADD COLUMN accepted_terms_of_service boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'privacy_policy_accepted_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN privacy_policy_accepted_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'terms_of_service_accepted_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN terms_of_service_accepted_at timestamptz;
  END IF;
END $$;