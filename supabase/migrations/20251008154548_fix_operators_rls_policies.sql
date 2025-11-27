/*
  # Fix Operators RLS Policies

  1. Changes
    - Drop duplicate and incorrect "Companies view their operators" policy
    - Drop duplicate and incorrect "Companies insert operators" policy
    - Keep only the correct policies that check through companies table
  
  2. Security
    - Ensures operators are only visible to their company owners
    - Maintains proper foreign key relationship through companies table
*/

-- Drop the incorrect policies that try to match company_id directly with auth.uid()
DROP POLICY IF EXISTS "Companies view their operators" ON operators;
DROP POLICY IF EXISTS "Companies insert operators" ON operators;

-- The correct policies already exist:
-- "Companies can view their operators" - checks through companies table
-- "Companies can insert operators" - checks through companies table
-- "Companies can update their operators" - checks through companies table
-- "Companies can delete their operators" - checks through companies table
