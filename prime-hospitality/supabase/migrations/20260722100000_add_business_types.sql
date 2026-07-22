-- ==========================================
-- 20260722100000_add_business_types.sql
-- Adds a lookup table for employer business types (Hotel, Restaurant, Cafe,
-- plus custom types added via the admin "Other" option).
-- ==========================================

CREATE TABLE IF NOT EXISTS public.business_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.business_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Business types are viewable by everyone"
ON public.business_types FOR SELECT USING (true);

INSERT INTO public.business_types (name) VALUES
  ('Hotel'),
  ('Restaurant'),
  ('Cafe')
ON CONFLICT (name) DO NOTHING;
