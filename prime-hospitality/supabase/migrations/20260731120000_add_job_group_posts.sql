-- Every group announcement of a job, not just the most recent one.
--
-- `jobs.announced_message_id` held exactly one message id, which was right
-- while a job could only ever appear in the group once. The group boost breaks
-- that assumption: a standard job can be posted 3 times a day and a premium one
-- 5, so a single column would silently forget every post but the last -- and
-- the retraction path reads that column, so deleting a job would leave every
-- earlier post orphaned in the group with a dead "View & Apply" button.
--
-- This table also turns out to be the natural quota counter. "How many times
-- has this job been posted to the group today" is a row count over posted_at,
-- and because the first announcement is recorded here like any other, it counts
-- as post #1 for free -- no separate bookkeeping for "initial vs boost".

CREATE TABLE IF NOT EXISTS public.job_group_posts (
  id         BIGSERIAL PRIMARY KEY,
  job_id     UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  message_id BIGINT NOT NULL,
  posted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Denormalised on purpose. The retraction trigger fires while the cascade
  -- from `jobs` is in flight, so the parent row is already gone and a lookup
  -- by job_id would return NULL. This is only ever used to label the queue
  -- entry for logs, so a stale copy of the title is exactly good enough.
  job_title  TEXT
);

COMMENT ON TABLE public.job_group_posts IS
  'One row per Telegram group announcement of a job. Drives both the boost quota (rows today) and retraction (every message id to delete).';

-- Serves the quota count: rows for one job since the start of today.
CREATE INDEX IF NOT EXISTS job_group_posts_job_posted_idx
  ON public.job_group_posts (job_id, posted_at DESC);

-- Service-role-only, same reasoning as retracted_announcements: RLS on with no
-- policy keeps PostgREST's anon key out, and the edge functions bypass RLS.
ALTER TABLE public.job_group_posts ENABLE ROW LEVEL SECURITY;

-- Carry over what the single column already knew, so jobs announced before this
-- migration are still retractable and still count toward today's quota.
INSERT INTO public.job_group_posts (job_id, message_id, posted_at, job_title)
SELECT id, announced_message_id, COALESCE(announced_at, created_at), title
FROM public.jobs
WHERE announced_message_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- The retraction trigger moves from `jobs` to `job_group_posts`.
--
-- It cannot stay an AFTER DELETE trigger on `jobs` that reads the child rows:
-- PostgreSQL fires same-event row triggers in name order, and the foreign key's
-- internal "RI_ConstraintTrigger_..." sorts ahead of any lowercase user trigger
-- name, so the cascade would already have deleted the rows it wanted to read.
-- Hanging it on the child instead sidesteps the ordering question entirely --
-- each row queues itself as it goes, whether it was removed by a cascade from
-- `jobs`, by a boost being retired, or by hand.
DROP TRIGGER IF EXISTS jobs_queue_announcement_retraction ON public.jobs;

CREATE OR REPLACE FUNCTION public.queue_announcement_retraction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- ON CONFLICT because a message_id already queued and not yet processed must
  -- not raise and abort the delete. Taking a post down is best-effort; it must
  -- never be the reason an employer cannot remove their vacancy.
  INSERT INTO public.retracted_announcements (message_id, job_title)
  VALUES (OLD.message_id, OLD.job_title)
  ON CONFLICT (message_id) DO NOTHING;
  RETURN OLD;
END;
$$;

CREATE TRIGGER job_group_posts_queue_retraction
  AFTER DELETE ON public.job_group_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_announcement_retraction();

COMMENT ON COLUMN public.jobs.announced_message_id IS
  'Telegram message_id of this job''s MOST RECENT group announcement. Kept for reference; job_group_posts is the full record and what retraction reads.';
