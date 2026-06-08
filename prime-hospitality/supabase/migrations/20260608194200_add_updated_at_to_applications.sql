-- ==========================================
-- 20260608194200_add_updated_at_to_applications.sql
-- Add missing updated_at column to applications table
-- ==========================================

ALTER TABLE public.applications 
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL;
