-- Add logo_url column to employers table
-- This column is selected in the jobs query (joined with employers) and was missing.

ALTER TABLE public.employers
  ADD COLUMN IF NOT EXISTS logo_url text;
