-- Take a job's group post down when the job itself is deleted.
--
-- A vacancy announced to the Telegram group outlives the job record: deleting
-- the row removes it from the app while the post keeps sitting in the group,
-- so seekers tap "View & Apply" on a job that no longer exists. Telegram will
-- delete a message on request, but only by message_id, and the announcer
-- logged that id without ever storing it.
--
-- Two pieces here. jobs.announced_message_id keeps the id at announce time.
-- retracted_announcements is a work queue: the row is gone by the time anyone
-- could act on it, so the id has to be copied somewhere that survives the
-- delete. An AFTER DELETE trigger does that copying, which means every delete
-- path is covered -- the employer dashboard, the admin dashboard, a cascade,
-- or a hand-written DELETE in the SQL editor -- without any of them knowing
-- this feature exists.
--
-- The every-minute expiry cron drains the queue, because it already holds the
-- bot token and already runs. That puts a post's removal up to a minute behind
-- the job's deletion, which is the right trade against handing the token to
-- Vercel purely so a server action could call Telegram inline.

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS announced_message_id BIGINT;

COMMENT ON COLUMN public.jobs.announced_message_id IS
  'Telegram message_id of this job''s group announcement, or NULL if it was never announced. Used to delete the post if the job is deleted.';

CREATE TABLE IF NOT EXISTS public.retracted_announcements (
  message_id  BIGINT PRIMARY KEY,
  job_title   TEXT,
  queued_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  attempts    SMALLINT NOT NULL DEFAULT 0
);

COMMENT ON TABLE public.retracted_announcements IS
  'Group posts whose job has been deleted, awaiting removal from Telegram by the expiry cron. deleted_at set once Telegram confirms.';

-- Only unfinished work is ever scanned, so the index covers exactly that and
-- stays small as processed rows accumulate.
CREATE INDEX IF NOT EXISTS retracted_announcements_pending_idx
  ON public.retracted_announcements (queued_at)
  WHERE deleted_at IS NULL;

-- The queue is service-role-only work. Enabling RLS without a policy is the
-- point: PostgREST reaches this table with the anon key otherwise, and the
-- edge functions bypass RLS regardless of what is defined here.
ALTER TABLE public.retracted_announcements ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.queue_announcement_retraction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.announced_message_id IS NOT NULL THEN
    -- ON CONFLICT because a message_id already queued and not yet processed
    -- must not raise and abort the delete. Taking a post down is best-effort;
    -- it must never be the reason an employer cannot remove their vacancy.
    INSERT INTO public.retracted_announcements (message_id, job_title)
    VALUES (OLD.announced_message_id, OLD.title)
    ON CONFLICT (message_id) DO NOTHING;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS jobs_queue_announcement_retraction ON public.jobs;
CREATE TRIGGER jobs_queue_announcement_retraction
  AFTER DELETE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_announcement_retraction();
