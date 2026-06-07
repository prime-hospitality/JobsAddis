-- Add daily_post_limit to employers table
-- Values: 3, 5, or -1 (unlimited)
ALTER TABLE public.employers
  ADD COLUMN IF NOT EXISTS daily_post_limit INTEGER NOT NULL DEFAULT 3;
