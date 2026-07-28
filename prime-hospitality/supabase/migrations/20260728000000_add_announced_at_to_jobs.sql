-- ==========================================
-- 20260728000000_add_announced_at_to_jobs.sql
-- Fixes vacancy alerts (§17.A.5) and automatic vacancy posting (§17.D.1),
-- neither of which reliably fired.
--
-- Both were wired only into the `post_job` action of validate-telegram-auth --
-- the Telegram-surface employer flow. But employers post from the web
-- dashboard (createEmployerJob) and admins from the platform-jobs tab, and
-- neither of those announced anything or created a single alert. In practice
-- almost no job produced either.
--
-- They were also hooked to the wrong event. Announcing at insert time
-- broadcasts a job that is still `pending` admin moderation, before anyone has
-- approved it. And a `scheduled` job published later by the cron never
-- announced at all, because the insert had happened days earlier.
--
-- The correct trigger is "the job became visible to seekers", i.e. it entered
-- `active`. That single condition covers every route in:
--   * employer web post with auto_publish -> active immediately
--   * admin approves a pending job       -> active
--   * cron publishes a scheduled job     -> active
--   * edge function post_job             -> active
--
-- So `announced_at` marks a job as having been broadcast, and the every-minute
-- sweep in job-expiration-cron handles any active job that hasn't been. Same
-- claim-then-act pattern as `notifications.dm_sent_at` (20260727030000), for
-- the same reason: overlapping sweeps must not double-post.
-- ==========================================

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS announced_at TIMESTAMPTZ;

-- The sweep polls for unannounced active jobs every minute. Partial index:
-- once announced, a job leaves the working set permanently.
CREATE INDEX IF NOT EXISTS jobs_pending_announcement_idx
  ON public.jobs (created_at)
  WHERE announced_at IS NULL;

-- Existing jobs predate this. Mark them all announced so switching the sweep on
-- doesn't dump the entire back catalogue into the Telegram group at once and
-- fan out a vacancy alert to every subscriber for every historical job.
UPDATE public.jobs
  SET announced_at = now()
  WHERE announced_at IS NULL;
