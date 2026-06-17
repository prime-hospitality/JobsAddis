-- Add alert_experience_level column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS alert_experience_level text DEFAULT NULL;
