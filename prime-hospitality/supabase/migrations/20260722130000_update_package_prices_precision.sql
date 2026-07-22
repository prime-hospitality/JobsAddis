-- ==========================================
-- 20260722130000_update_package_prices_precision.sql
-- The original package prices had cents (e.g. 1,983.75 ETB) that were
-- rounded to whole integers when first seeded. Widen the column to store
-- exact values and restore the precise prices.
-- ==========================================

ALTER TABLE public.packages ALTER COLUMN price TYPE numeric(10,2);

UPDATE public.packages SET price = 1983.75 WHERE name = 'Three Days Package';
UPDATE public.packages SET price = 2645.00 WHERE name = 'Five Days Package';
UPDATE public.packages SET price = 3306.25 WHERE name = 'One Week Package';
UPDATE public.packages SET price = 5290.00 WHERE name = 'Two Weeks Package';
UPDATE public.packages SET price = 7273.75 WHERE name = 'One Month Package';
UPDATE public.packages SET price = 16531.25 WHERE name = 'Three Month''s Package';
UPDATE public.packages SET price = 25127.50 WHERE name = 'Six Month''s Membership';
UPDATE public.packages SET price = 46287.50 WHERE name = 'One Year Membership';
