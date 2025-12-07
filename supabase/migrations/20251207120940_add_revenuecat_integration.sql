/*
  # RevenueCat Integration

  1. Changes to Existing Tables
    - Add `revenuecat_customer_id` to subscriptions table for RevenueCat user mapping
    - Add `revenuecat_product_id` to subscriptions table to track which product was purchased
    - Update payment_history to support additional payment methods

  2. Important Notes
    - RevenueCat webhooks will update subscription status automatically
    - Google Play and Apple App Store payments handled through RevenueCat
    - Existing subscriptions remain compatible
*/

-- Add RevenueCat fields to subscriptions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'revenuecat_customer_id'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN revenuecat_customer_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'revenuecat_product_id'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN revenuecat_product_id text;
  END IF;
END $$;

-- Create index for faster RevenueCat customer lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_revenuecat_customer_id
  ON subscriptions(revenuecat_customer_id);

-- Update payment_history check constraint to include new payment methods
ALTER TABLE payment_history DROP CONSTRAINT IF EXISTS valid_payment_method;
ALTER TABLE payment_history ADD CONSTRAINT valid_payment_method
  CHECK (payment_method IN ('google_play', 'apple_pay', 'manual', 'stripe'));

-- Create function to update subscription from RevenueCat webhook
CREATE OR REPLACE FUNCTION update_subscription_from_revenuecat(
  p_user_id uuid,
  p_product_id text,
  p_status text,
  p_period_start timestamptz,
  p_period_end timestamptz
)
RETURNS void AS $$
DECLARE
  v_company_id uuid;
BEGIN
  -- Get company_id for the user
  SELECT company_id INTO v_company_id
  FROM profiles
  WHERE id = p_user_id;

  -- If user is a company owner, use their profile id
  IF v_company_id IS NULL THEN
    SELECT id INTO v_company_id
    FROM companies
    WHERE owner_id = p_user_id;
  END IF;

  -- Update subscription
  IF v_company_id IS NOT NULL THEN
    UPDATE subscriptions
    SET
      revenuecat_customer_id = p_user_id::text,
      revenuecat_product_id = p_product_id,
      status = p_status,
      current_period_start = p_period_start,
      current_period_end = p_period_end,
      updated_at = now()
    WHERE company_id = v_company_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
