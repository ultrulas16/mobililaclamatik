/*
  # Create Visit Types and Target Pests Tables

  1. New Tables
    - `company_visit_types`
      - `id` (uuid, primary key)
      - `company_id` (uuid, foreign key to profiles)
      - `name` (text, visit type name)
      - `description` (text, optional description)
      - `is_active` (boolean, default true)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `company_target_pests`
      - `id` (uuid, primary key)
      - `company_id` (uuid, foreign key to profiles)
      - `name` (text, pest name)
      - `description` (text, optional description)
      - `is_active` (boolean, default true)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Companies can only manage their own visit types and target pests
    - Policies check that company_id matches authenticated user's id

  3. Indexes
    - company_id for fast lookups
    - is_active for filtering active records

  4. Triggers
    - Auto-update updated_at timestamp on changes
*/

-- Create company_visit_types table
CREATE TABLE IF NOT EXISTS public.company_visit_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT company_visit_types_pkey PRIMARY KEY (id),
    CONSTRAINT company_visit_types_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Create company_target_pests table
CREATE TABLE IF NOT EXISTS public.company_target_pests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT company_target_pests_pkey PRIMARY KEY (id),
    CONSTRAINT company_target_pests_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Indexes for company_visit_types
CREATE INDEX IF NOT EXISTS idx_company_visit_types_company_id ON public.company_visit_types USING btree (company_id);
CREATE INDEX IF NOT EXISTS idx_company_visit_types_is_active ON public.company_visit_types USING btree (is_active);

-- Indexes for company_target_pests
CREATE INDEX IF NOT EXISTS idx_company_target_pests_company_id ON public.company_target_pests USING btree (company_id);
CREATE INDEX IF NOT EXISTS idx_company_target_pests_is_active ON public.company_target_pests USING btree (is_active);

-- RLS for company_visit_types
ALTER TABLE public.company_visit_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies can view their visit types"
  ON public.company_visit_types
  FOR SELECT
  TO authenticated
  USING (company_id = auth.uid());

CREATE POLICY "Companies can insert their visit types"
  ON public.company_visit_types
  FOR INSERT
  TO authenticated
  WITH CHECK (company_id = auth.uid());

CREATE POLICY "Companies can update their visit types"
  ON public.company_visit_types
  FOR UPDATE
  TO authenticated
  USING (company_id = auth.uid())
  WITH CHECK (company_id = auth.uid());

CREATE POLICY "Companies can delete their visit types"
  ON public.company_visit_types
  FOR DELETE
  TO authenticated
  USING (company_id = auth.uid());

-- RLS for company_target_pests
ALTER TABLE public.company_target_pests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies can view their target pests"
  ON public.company_target_pests
  FOR SELECT
  TO authenticated
  USING (company_id = auth.uid());

CREATE POLICY "Companies can insert their target pests"
  ON public.company_target_pests
  FOR INSERT
  TO authenticated
  WITH CHECK (company_id = auth.uid());

CREATE POLICY "Companies can update their target pests"
  ON public.company_target_pests
  FOR UPDATE
  TO authenticated
  USING (company_id = auth.uid())
  WITH CHECK (company_id = auth.uid());

CREATE POLICY "Companies can delete their target pests"
  ON public.company_target_pests
  FOR DELETE
  TO authenticated
  USING (company_id = auth.uid());

-- Create function for updating updated_at if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at on company_visit_types
DROP TRIGGER IF EXISTS update_company_visit_types_updated_at ON public.company_visit_types;
CREATE TRIGGER update_company_visit_types_updated_at 
  BEFORE UPDATE ON public.company_visit_types 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Triggers for updated_at on company_target_pests
DROP TRIGGER IF EXISTS update_company_target_pests_updated_at ON public.company_target_pests;
CREATE TRIGGER update_company_target_pests_updated_at 
  BEFORE UPDATE ON public.company_target_pests 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();