-- ==========================================
-- 20260728120000_retry_failed_group_announcements.sql
-- Makes the group announcement survive a failed Telegram call.
--
-- 20260728000000 introduced `announced_at` as a claim: the sweep stamps it
-- *before* posting so two overlapping sweeps can't post the same vacancy twice.
-- The gap is what happens when the post then fails. Nothing cleared the stamp,
-- so the job stayed marked announced forever and silently never reached the
-- group. A single dropped connection was enough -- and one did happen:
--
--   [Telegram Group] Error sending message: TypeError: error sending request
--   for url (.../sendMessage): client error (Connect): Connection reset by peer
--
-- The sweep now clears `announced_at` when a post fails so the next run retries,
-- and counts the attempts here so a job that fails for a permanent reason (a
-- malformed field Telegram rejects with a 400) stops after a few tries instead
-- of retrying every minute forever.
--
-- `alerts_queued_at` exists because of that retry. Announcing and fanning out
-- vacancy alerts were one unit of work guarded by one flag; re-running the unit
-- would DM every subscriber a second time. Alerts now carry their own marker, so
-- a retried announcement re-posts to the group without re-alerting anyone.
-- ==========================================

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS announce_attempts SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS alerts_queued_at TIMESTAMPTZ;

-- Jobs announced before this migration had their alerts queued in the same
-- pass, so backfill the marker from it. Without this, any of them that later
-- re-enters the announce path would fan out a duplicate alert.
UPDATE public.jobs
  SET alerts_queued_at = announced_at
  WHERE announced_at IS NOT NULL AND alerts_queued_at IS NULL;
