-- Migration: Add quantity column to jobs table
ALTER TABLE public.jobs ADD COLUMN quantity integer NOT NULL DEFAULT 1;
