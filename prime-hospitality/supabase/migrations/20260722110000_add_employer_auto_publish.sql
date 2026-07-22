-- ==========================================
-- 20260722110000_add_employer_auto_publish.sql
-- Adds a per-employer flag admins can enable to let a trusted
-- employer's job posts go live instantly, skipping the moderation
-- review workflow (implemented separately).
-- ==========================================

ALTER TABLE public.employers
  ADD COLUMN IF NOT EXISTS auto_publish boolean NOT NULL DEFAULT false;
