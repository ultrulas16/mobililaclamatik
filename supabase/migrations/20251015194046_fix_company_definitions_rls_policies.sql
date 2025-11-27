/*
  # Fix Company Definitions RLS Policies

  1. Problem
    - Current policies check `company_id = auth.uid()` which is incorrect
    - auth.uid() returns the user's profile ID, not their company_id
    - Companies cannot insert/update/delete their own definition records

  2. Solution
    - Update all INSERT, UPDATE, DELETE policies to check against profiles table
    - Allow users whose profile.company_id matches the record's company_id
    - Keep SELECT policies as they already work with operator access

  3. Affected Tables
    - company_materials
    - company_biocidal_products
    - company_equipment
    - company_visit_types
    - company_target_pests

  4. Security
    - Users can only modify data for their own company
    - Based on company_id relationship in profiles table
*/

-- Fix company_materials policies
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'company_materials' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS "Companies can view their materials" ON company_materials;
    CREATE POLICY "Companies can view their materials"
      ON company_materials FOR SELECT
      TO authenticated
      USING (
        company_id IN (
          SELECT p.company_id
          FROM profiles p
          WHERE p.id = auth.uid()
          AND p.company_id IS NOT NULL
        )
      );

    DROP POLICY IF EXISTS "Companies can insert their materials" ON company_materials;
    CREATE POLICY "Companies can insert their materials"
      ON company_materials FOR INSERT
      TO authenticated
      WITH CHECK (
        company_id IN (
          SELECT p.company_id
          FROM profiles p
          WHERE p.id = auth.uid()
          AND p.company_id IS NOT NULL
        )
      );

    DROP POLICY IF EXISTS "Companies can update their materials" ON company_materials;
    CREATE POLICY "Companies can update their materials"
      ON company_materials FOR UPDATE
      TO authenticated
      USING (
        company_id IN (
          SELECT p.company_id
          FROM profiles p
          WHERE p.id = auth.uid()
          AND p.company_id IS NOT NULL
        )
      )
      WITH CHECK (
        company_id IN (
          SELECT p.company_id
          FROM profiles p
          WHERE p.id = auth.uid()
          AND p.company_id IS NOT NULL
        )
      );

    DROP POLICY IF EXISTS "Companies can delete their materials" ON company_materials;
    CREATE POLICY "Companies can delete their materials"
      ON company_materials FOR DELETE
      TO authenticated
      USING (
        company_id IN (
          SELECT p.company_id
          FROM profiles p
          WHERE p.id = auth.uid()
          AND p.company_id IS NOT NULL
        )
      );
  END IF;
END $$;

-- Fix company_biocidal_products policies
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'company_biocidal_products' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS "Companies can view their biocidal products" ON company_biocidal_products;
    CREATE POLICY "Companies can view their biocidal products"
      ON company_biocidal_products FOR SELECT
      TO authenticated
      USING (
        company_id IN (
          SELECT p.company_id
          FROM profiles p
          WHERE p.id = auth.uid()
          AND p.company_id IS NOT NULL
        )
      );

    DROP POLICY IF EXISTS "Companies can insert their biocidal products" ON company_biocidal_products;
    CREATE POLICY "Companies can insert their biocidal products"
      ON company_biocidal_products FOR INSERT
      TO authenticated
      WITH CHECK (
        company_id IN (
          SELECT p.company_id
          FROM profiles p
          WHERE p.id = auth.uid()
          AND p.company_id IS NOT NULL
        )
      );

    DROP POLICY IF EXISTS "Companies can update their biocidal products" ON company_biocidal_products;
    CREATE POLICY "Companies can update their biocidal products"
      ON company_biocidal_products FOR UPDATE
      TO authenticated
      USING (
        company_id IN (
          SELECT p.company_id
          FROM profiles p
          WHERE p.id = auth.uid()
          AND p.company_id IS NOT NULL
        )
      )
      WITH CHECK (
        company_id IN (
          SELECT p.company_id
          FROM profiles p
          WHERE p.id = auth.uid()
          AND p.company_id IS NOT NULL
        )
      );

    DROP POLICY IF EXISTS "Companies can delete their biocidal products" ON company_biocidal_products;
    CREATE POLICY "Companies can delete their biocidal products"
      ON company_biocidal_products FOR DELETE
      TO authenticated
      USING (
        company_id IN (
          SELECT p.company_id
          FROM profiles p
          WHERE p.id = auth.uid()
          AND p.company_id IS NOT NULL
        )
      );
  END IF;
END $$;

-- Fix company_equipment policies
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'company_equipment' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS "Companies can view their equipment" ON company_equipment;
    CREATE POLICY "Companies can view their equipment"
      ON company_equipment FOR SELECT
      TO authenticated
      USING (
        company_id IN (
          SELECT p.company_id
          FROM profiles p
          WHERE p.id = auth.uid()
          AND p.company_id IS NOT NULL
        )
      );

    DROP POLICY IF EXISTS "Companies can insert their equipment" ON company_equipment;
    CREATE POLICY "Companies can insert their equipment"
      ON company_equipment FOR INSERT
      TO authenticated
      WITH CHECK (
        company_id IN (
          SELECT p.company_id
          FROM profiles p
          WHERE p.id = auth.uid()
          AND p.company_id IS NOT NULL
        )
      );

    DROP POLICY IF EXISTS "Companies can update their equipment" ON company_equipment;
    CREATE POLICY "Companies can update their equipment"
      ON company_equipment FOR UPDATE
      TO authenticated
      USING (
        company_id IN (
          SELECT p.company_id
          FROM profiles p
          WHERE p.id = auth.uid()
          AND p.company_id IS NOT NULL
        )
      )
      WITH CHECK (
        company_id IN (
          SELECT p.company_id
          FROM profiles p
          WHERE p.id = auth.uid()
          AND p.company_id IS NOT NULL
        )
      );

    DROP POLICY IF EXISTS "Companies can delete their equipment" ON company_equipment;
    CREATE POLICY "Companies can delete their equipment"
      ON company_equipment FOR DELETE
      TO authenticated
      USING (
        company_id IN (
          SELECT p.company_id
          FROM profiles p
          WHERE p.id = auth.uid()
          AND p.company_id IS NOT NULL
        )
      );
  END IF;
END $$;

-- Fix company_visit_types policies
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'company_visit_types' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS "Companies can view their visit types" ON company_visit_types;
    CREATE POLICY "Companies can view their visit types"
      ON company_visit_types FOR SELECT
      TO authenticated
      USING (
        company_id IN (
          SELECT p.company_id
          FROM profiles p
          WHERE p.id = auth.uid()
          AND p.company_id IS NOT NULL
        )
      );

    DROP POLICY IF EXISTS "Companies can insert their visit types" ON company_visit_types;
    CREATE POLICY "Companies can insert their visit types"
      ON company_visit_types FOR INSERT
      TO authenticated
      WITH CHECK (
        company_id IN (
          SELECT p.company_id
          FROM profiles p
          WHERE p.id = auth.uid()
          AND p.company_id IS NOT NULL
        )
      );

    DROP POLICY IF EXISTS "Companies can update their visit types" ON company_visit_types;
    CREATE POLICY "Companies can update their visit types"
      ON company_visit_types FOR UPDATE
      TO authenticated
      USING (
        company_id IN (
          SELECT p.company_id
          FROM profiles p
          WHERE p.id = auth.uid()
          AND p.company_id IS NOT NULL
        )
      )
      WITH CHECK (
        company_id IN (
          SELECT p.company_id
          FROM profiles p
          WHERE p.id = auth.uid()
          AND p.company_id IS NOT NULL
        )
      );

    DROP POLICY IF EXISTS "Companies can delete their visit types" ON company_visit_types;
    CREATE POLICY "Companies can delete their visit types"
      ON company_visit_types FOR DELETE
      TO authenticated
      USING (
        company_id IN (
          SELECT p.company_id
          FROM profiles p
          WHERE p.id = auth.uid()
          AND p.company_id IS NOT NULL
        )
      );
  END IF;
END $$;

-- Fix company_target_pests policies
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'company_target_pests' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS "Companies can view their target pests" ON company_target_pests;
    CREATE POLICY "Companies can view their target pests"
      ON company_target_pests FOR SELECT
      TO authenticated
      USING (
        company_id IN (
          SELECT p.company_id
          FROM profiles p
          WHERE p.id = auth.uid()
          AND p.company_id IS NOT NULL
        )
      );

    DROP POLICY IF EXISTS "Companies can insert their target pests" ON company_target_pests;
    CREATE POLICY "Companies can insert their target pests"
      ON company_target_pests FOR INSERT
      TO authenticated
      WITH CHECK (
        company_id IN (
          SELECT p.company_id
          FROM profiles p
          WHERE p.id = auth.uid()
          AND p.company_id IS NOT NULL
        )
      );

    DROP POLICY IF EXISTS "Companies can update their target pests" ON company_target_pests;
    CREATE POLICY "Companies can update their target pests"
      ON company_target_pests FOR UPDATE
      TO authenticated
      USING (
        company_id IN (
          SELECT p.company_id
          FROM profiles p
          WHERE p.id = auth.uid()
          AND p.company_id IS NOT NULL
        )
      )
      WITH CHECK (
        company_id IN (
          SELECT p.company_id
          FROM profiles p
          WHERE p.id = auth.uid()
          AND p.company_id IS NOT NULL
        )
      );

    DROP POLICY IF EXISTS "Companies can delete their target pests" ON company_target_pests;
    CREATE POLICY "Companies can delete their target pests"
      ON company_target_pests FOR DELETE
      TO authenticated
      USING (
        company_id IN (
          SELECT p.company_id
          FROM profiles p
          WHERE p.id = auth.uid()
          AND p.company_id IS NOT NULL
        )
      );
  END IF;
END $$;