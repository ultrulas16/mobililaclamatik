/*
  # Subscription Management System

  1. New Tables
    - `subscriptions`
      - `id` (uuid, primary key)
      - `company_id` (uuid, references profiles)
      - `status` (text) - active, trial, expired, cancelled
      - `trial_ends_at` (timestamptz) - 7 days from creation
      - `current_period_start` (timestamptz)
      - `current_period_end` (timestamptz)
      - `cancel_at_period_end` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `payment_history`
      - `id` (uuid, primary key)
      - `subscription_id` (uuid, references subscriptions)
      - `amount` (numeric)
      - `currency` (text)
      - `status` (text) - pending, completed, failed
      - `payment_method` (text) - google_play, manual
      - `transaction_id` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Companies can only view their own subscription
    - Only admin can view all subscriptions
    - Payment history is read-only for companies

  3. Important Notes
    - Trial period: 7 days from registration
    - After trial: subscription must be active
    - Inactive companies cannot access system
    - Admin can manually activate/deactivate
*/

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'trial',
  trial_ends_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  current_period_start timestamptz DEFAULT now(),
  current_period_end timestamptz DEFAULT (now() + interval '30 days'),
  cancel_at_period_end boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('trial', 'active', 'expired', 'cancelled'))
);

-- Create payment history table
CREATE TABLE IF NOT EXISTS payment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending',
  payment_method text NOT NULL DEFAULT 'manual',
  transaction_id text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_payment_status CHECK (status IN ('pending', 'completed', 'failed')),
  CONSTRAINT valid_payment_method CHECK (payment_method IN ('google_play', 'apple_pay', 'manual'))
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_company_id ON subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_payment_history_subscription_id ON payment_history(subscription_id);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- Subscriptions policies
CREATE POLICY "Admin can view all subscriptions"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Companies can view own subscription"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (
    company_id = auth.uid()
    OR company_id IN (
      SELECT company_id FROM profiles
      WHERE id = auth.uid()
      AND company_id IS NOT NULL
    )
  );

CREATE POLICY "Admin can manage all subscriptions"
  ON subscriptions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Payment history policies
CREATE POLICY "Admin can view all payment history"
  ON payment_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Companies can view own payment history"
  ON payment_history FOR SELECT
  TO authenticated
  USING (
    subscription_id IN (
      SELECT id FROM subscriptions
      WHERE company_id = auth.uid()
      OR company_id IN (
        SELECT company_id FROM profiles
        WHERE id = auth.uid()
        AND company_id IS NOT NULL
      )
    )
  );

-- Function to automatically create subscription on company registration
CREATE OR REPLACE FUNCTION create_subscription_on_company_registration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'company' THEN
    INSERT INTO subscriptions (company_id, status, trial_ends_at)
    VALUES (
      NEW.id,
      'trial',
      now() + interval '7 days'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create subscription automatically
DROP TRIGGER IF EXISTS create_subscription_trigger ON profiles;
CREATE TRIGGER create_subscription_trigger
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_subscription_on_company_registration();

-- Function to check and update expired subscriptions
CREATE OR REPLACE FUNCTION update_expired_subscriptions()
RETURNS void AS $$
BEGIN
  UPDATE subscriptions
  SET status = 'expired', updated_at = now()
  WHERE status = 'trial'
  AND trial_ends_at < now();

  UPDATE subscriptions
  SET status = 'expired', updated_at = now()
  WHERE status = 'active'
  AND current_period_end < now()
  AND NOT cancel_at_period_end;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;