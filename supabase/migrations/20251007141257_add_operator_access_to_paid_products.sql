/*
  # Add Operator Access to Paid Products

  1. Changes
    - Add SELECT policy for operators to view their company's paid products
  
  2. Security
    - Operators can only view paid products from their own company
    - Policy checks company_id matches operator's company
*/

-- Allow operators to view their company's paid products
CREATE POLICY "Operators can view company paid products"
  ON public.paid_products
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT o.company_id
      FROM operators o
      WHERE o.profile_id = auth.uid()
    )
  );
