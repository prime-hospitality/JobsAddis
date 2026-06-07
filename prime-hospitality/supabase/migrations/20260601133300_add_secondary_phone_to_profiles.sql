-- Migration to add secondary_phone to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS secondary_phone text;
