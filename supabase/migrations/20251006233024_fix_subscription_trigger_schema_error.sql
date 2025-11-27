/*
  # Fix Subscription Trigger Schema Error

  This migration fixes the "relation subscriptions does not exist" error by:
  
  1. Dropping the existing trigger and function
  2. Recreating the function with explicit schema references
  3. Recreating the trigger
  
  This ensures the function properly references public.subscriptions table.
*/

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS create_subscription_trigger ON public.companies;

-- Drop existing function if exists
DROP FUNCTION IF EXISTS create_subscription_on_company_registration();

-- Recreate the function with explicit schema reference
CREATE OR REPLACE FUNCTION create_subscription_on_company_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert a new subscription record for the newly created company
  INSERT INTO public.subscriptions (
    company_id,
    status,
    trial_ends_at,
    current_period_start,
    current_period_end,
    cancel_at_period_end
  ) VALUES (
    NEW.id,
    'trial',
    now() + interval '7 days',
    now(),
    now() + interval '30 days',
    false
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't prevent company creation
    RAISE WARNING 'Failed to create subscription for company %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER create_subscription_trigger
  AFTER INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION create_subscription_on_company_registration();
