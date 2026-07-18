-- ==========================================
-- 20260718100000_add_authorization_number.sql
-- Adds authorization_number to employers table
-- ==========================================

ALTER TABLE public.employers
  ADD COLUMN IF NOT EXISTS authorization_number varchar(5);
