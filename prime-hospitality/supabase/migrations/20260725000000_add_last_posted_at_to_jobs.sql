-- Add last_posted_at to jobs: the most recent time a job was published or reposted.
--
-- created_at stays FROZEN as the original first-post date (used by the admin
-- posts-per-day analytics report). last_posted_at is the new "live-again" stamp
-- and drives: the employer daily-post counter, the job-seeker "Posted X ago"
-- label + feed ordering, and the "Reposted on <date>" note in the
-- employer/admin dashboards.

ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS last_posted_at TIMESTAMP WITH TIME ZONE;

-- Backfill existing rows to their original creation date so nothing looks reposted.
UPDATE public.jobs SET last_posted_at = created_at WHERE last_posted_at IS NULL;

-- New rows default to now() so every insert path (Post Now, templates, admin,
-- scheduled) fills it automatically without extra code.
ALTER TABLE public.jobs ALTER COLUMN last_posted_at SET DEFAULT now();

-- Seeker feed ordering + the daily-count query both filter/sort on this column.
CREATE INDEX IF NOT EXISTS jobs_last_posted_at_idx ON public.jobs (last_posted_at DESC);
