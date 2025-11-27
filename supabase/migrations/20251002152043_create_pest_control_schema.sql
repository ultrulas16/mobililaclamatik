/*
  # Pest Control Application Database Schema

  ## Overview
  Complete database schema for a multi-tenant pest control management system with role-based access control.

  ## New Tables

  ### 1. profiles
  User profiles with role-based access (admin, company, operator, customer, customer_branch)
  - `id` (uuid, primary key) - References auth.users
  - `email` (text, unique, required) - User email
  - `full_name` (text, required) - Full name
  - `phone` (text) - Contact phone
  - `role` (text, required) - User role (admin/company/operator/customer/customer_branch)
  - `company_id` (uuid) - References companies table (for company users)
  - `company_name` (text) - Company name (for company role)
  - `parent_customer_id` (uuid) - References profiles (for customer_branch)
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. companies
  Pest control companies/firms
  - `id` (uuid, primary key) - Company identifier
  - `name` (text, required) - Company name
  - `owner_id` (uuid) - References profiles (company owner)
  - `address` (text) - Company address
  - `phone` (text) - Company contact phone
  - `email` (text) - Company email
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 3. customers
  Customer accounts (can have multiple branches)
  - `id` (uuid, primary key) - Customer identifier
  - `profile_id` (uuid) - References profiles
  - `company_name` (text) - Customer company name
  - `address` (text) - Main address
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 4. customer_branches
  Customer branch locations
  - `id` (uuid, primary key) - Branch identifier
  - `customer_id` (uuid) - References customers
  - `profile_id` (uuid) - References profiles (branch manager)
  - `branch_name` (text, required) - Branch name
  - `address` (text, required) - Branch address
  - `phone` (text) - Branch phone
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 5. service_requests
  Service/treatment requests
  - `id` (uuid, primary key) - Request identifier
  - `customer_id` (uuid) - References customers
  - `branch_id` (uuid) - References customer_branches (optional)
  - `company_id` (uuid) - References companies
  - `operator_id` (uuid) - References profiles (assigned operator)
  - `service_type` (text) - Type of pest control service
  - `status` (text) - Request status (pending/assigned/in_progress/completed/cancelled)
  - `scheduled_date` (timestamptz) - Scheduled service date
  - `completed_date` (timestamptz) - Completion date
  - `notes` (text) - Additional notes
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Security
  - Enable RLS on all tables
  - Admin: Full access to all data
  - Company: Access to their company data and assigned customers
  - Operator: Access to their assigned service requests
  - Customer: Access to their own data and service requests
  - Customer Branch: Access to their branch data and related service requests

  ## Important Notes
  1. All tables use UUID primary keys with automatic generation
  2. Timestamps use timezone-aware types (timestamptz)
  3. Foreign key constraints ensure referential integrity
  4. RLS policies enforce role-based access control
  5. Default values ensure data consistency
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  phone text,
  role text NOT NULL CHECK (role IN ('admin', 'company', 'operator', 'customer', 'customer_branch')),
  company_id uuid,
  company_name text,
  parent_customer_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  address text,
  phone text,
  email text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  company_name text,
  address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Create customer_branches table
CREATE TABLE IF NOT EXISTS customer_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  branch_name text NOT NULL,
  address text NOT NULL,
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE customer_branches ENABLE ROW LEVEL SECURITY;

-- Create service_requests table
CREATE TABLE IF NOT EXISTS service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES customer_branches(id) ON DELETE SET NULL,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  operator_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  service_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')),
  scheduled_date timestamptz,
  completed_date timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;

-- Add foreign key for company_id in profiles (after companies table exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_company_id_fkey'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add foreign key for parent_customer_id in profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_parent_customer_id_fkey'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_parent_customer_id_fkey
      FOREIGN KEY (parent_customer_id) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admin can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Company can view their operators and customers"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'company'
        AND p.company_id = profiles.company_id
    )
  );

-- RLS Policies for companies
CREATE POLICY "Companies can view own data"
  ON companies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND (profiles.role = 'admin' OR profiles.company_id = companies.id)
    )
  );

CREATE POLICY "Admin can insert companies"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Company owners can update own company"
  ON companies FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND (profiles.role = 'admin' OR profiles.company_id = companies.id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND (profiles.role = 'admin' OR profiles.company_id = companies.id)
    )
  );

-- RLS Policies for customers
CREATE POLICY "Customers can view own data"
  ON customers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND (profiles.role = 'admin' OR profiles.id = customers.profile_id)
    )
  );

CREATE POLICY "Admin and companies can insert customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'company', 'customer')
    )
  );

CREATE POLICY "Customers can update own data"
  ON customers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND (profiles.role = 'admin' OR profiles.id = customers.profile_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND (profiles.role = 'admin' OR profiles.id = customers.profile_id)
    )
  );

-- RLS Policies for customer_branches
CREATE POLICY "Branches can view own data"
  ON customer_branches FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      LEFT JOIN customers c ON c.profile_id = p.id
      WHERE p.id = auth.uid()
        AND (
          p.role = 'admin'
          OR customer_branches.profile_id = p.id
          OR c.id = customer_branches.customer_id
        )
    )
  );

CREATE POLICY "Customers can insert branches"
  ON customer_branches FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      LEFT JOIN customers c ON c.profile_id = p.id
      WHERE p.id = auth.uid()
        AND (p.role = 'admin' OR c.id = customer_branches.customer_id)
    )
  );

CREATE POLICY "Branches can update own data"
  ON customer_branches FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      LEFT JOIN customers c ON c.profile_id = p.id
      WHERE p.id = auth.uid()
        AND (
          p.role = 'admin'
          OR customer_branches.profile_id = p.id
          OR c.id = customer_branches.customer_id
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      LEFT JOIN customers c ON c.profile_id = p.id
      WHERE p.id = auth.uid()
        AND (
          p.role = 'admin'
          OR customer_branches.profile_id = p.id
          OR c.id = customer_branches.customer_id
        )
    )
  );

-- RLS Policies for service_requests
CREATE POLICY "Service requests viewable by related users"
  ON service_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      LEFT JOIN customers c ON c.profile_id = p.id
      LEFT JOIN customer_branches cb ON cb.profile_id = p.id
      WHERE p.id = auth.uid()
        AND (
          p.role = 'admin'
          OR p.company_id = service_requests.company_id
          OR c.id = service_requests.customer_id
          OR cb.id = service_requests.branch_id
          OR p.id = service_requests.operator_id
        )
    )
  );

CREATE POLICY "Companies and customers can insert service requests"
  ON service_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      LEFT JOIN customers c ON c.profile_id = p.id
      WHERE p.id = auth.uid()
        AND (
          p.role = 'admin'
          OR p.company_id = service_requests.company_id
          OR c.id = service_requests.customer_id
        )
    )
  );

CREATE POLICY "Related users can update service requests"
  ON service_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND (
          p.role = 'admin'
          OR p.company_id = service_requests.company_id
          OR p.id = service_requests.operator_id
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND (
          p.role = 'admin'
          OR p.company_id = service_requests.company_id
          OR p.id = service_requests.operator_id
        )
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_companies_owner_id ON companies(owner_id);
CREATE INDEX IF NOT EXISTS idx_customers_profile_id ON customers(profile_id);
CREATE INDEX IF NOT EXISTS idx_customer_branches_customer_id ON customer_branches(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_branches_profile_id ON customer_branches(profile_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_customer_id ON service_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_company_id ON service_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_operator_id ON service_requests(operator_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);
