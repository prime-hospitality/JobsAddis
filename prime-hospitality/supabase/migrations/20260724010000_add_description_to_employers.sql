-- ==========================================
-- 20260724010000_add_description_to_employers.sql
-- Adds a free-text "About" description to employers, for the employer-facing
-- Company Profile tab.
-- ==========================================

ALTER TABLE public.employers
  ADD COLUMN IF NOT EXISTS description text;
