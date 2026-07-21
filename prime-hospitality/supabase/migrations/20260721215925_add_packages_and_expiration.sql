-- ==========================================
-- 20260721215925_add_packages_and_expiration.sql
-- Adds packages, updates jobs status, and extends notifications.
-- ==========================================

-- 1. Create Packages Table
CREATE TABLE IF NOT EXISTS public.packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  duration_days integer NOT NULL,
  price integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Packages
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Packages are viewable by everyone"
ON public.packages FOR SELECT USING (true);

-- Seed Packages data
INSERT INTO public.packages (name, duration_days, price) VALUES
  ('Three Days Package', 3, 1984),
  ('Five Days Package', 5, 2645),
  ('One Week Package', 7, 3306),
  ('Two Weeks Package', 14, 5290),
  ('One Month Package', 30, 7274),
  ('Three Month''s Package', 90, 16531),
  ('Six Month''s Membership', 180, 25128),
  ('One Year Membership', 365, 46288);


-- 2. Update Employers Table
ALTER TABLE public.employers 
  ADD COLUMN IF NOT EXISTS active_package_id uuid REFERENCES public.packages(id),
  ADD COLUMN IF NOT EXISTS package_expires_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS renewal_requested boolean DEFAULT false NOT NULL;

-- 3. Update Jobs Status Check
-- Drop the existing constraint and recreate it to include 'expired'
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_status_check 
  CHECK (status IN ('pending', 'active', 'closed', 'rejected', 'expired'));

-- 4. Update Notifications Type Check
-- Drop the existing constraint and recreate it to include employer notifications
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type IN ('shortlisted', 'rejected', 'message', 'job_expiring', 'subscription_expired'));
