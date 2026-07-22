-- ==========================================
-- 20260722120000_add_package_category.sql
-- Adds a category to packages so the admin Pricing tab and the public
-- /pricing page can group tiers into "standard" (3x/day posting) vs
-- "premium" (5x/day / long-term membership) without hardcoding names.
-- ==========================================

ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'standard'
  CHECK (category IN ('standard', 'premium'));

UPDATE public.packages
SET category = 'premium'
WHERE name IN ('Six Month''s Membership', 'One Year Membership');
