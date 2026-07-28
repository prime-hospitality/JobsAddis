-- ==========================================
-- 20260727030000_add_dm_delivery_to_notifications.sql
-- Telegram DM delivery tracking for notifications.
--
-- A Mini App has no push channel of its own -- it only exists while the user
-- has it open -- so a bot DM is the only way to reach someone who isn't
-- currently looking at the app. Until now every notification was in-app only,
-- which meant vacancy alerts, shortlist notices and admin broadcasts were
-- invisible unless the user happened to reopen the app.
--
-- Delivery is centralised in the notification dispatcher inside
-- job-expiration-cron (the every-minute sweep) rather than fired from each
-- call site, for two reasons:
--   1. `deliver_after` -- a shortlist notice is held for a short undo window
--      (see 20260726000000; length lives in SHORTLIST_NOTICE_DELAY_MINUTES).
--      A DM sent at click time could not be taken back, so delivery must wait
--      for that window to lapse.
--   2. Idempotency -- `dm_sent_at` marks a row as dispatched so a retried or
--      overlapping sweep can't message the same person twice.
--
-- NULL dm_sent_at = not yet dispatched. Rows are marked after the send
-- attempt regardless of outcome: a user who has blocked or never started the
-- bot is a permanent failure, not something to retry every minute forever.
-- ==========================================

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS dm_sent_at TIMESTAMPTZ;

-- The dispatcher polls for undispatched rows every minute. Partial index: once
-- a row is dispatched it leaves the working set permanently, and dispatched
-- rows quickly become the overwhelming majority.
CREATE INDEX IF NOT EXISTS notifications_dm_pending_idx
  ON public.notifications (created_at)
  WHERE dm_sent_at IS NULL;

-- Existing notifications predate DM delivery. Mark them dispatched so enabling
-- the dispatcher doesn't blast the entire backlog at every user at once.
UPDATE public.notifications
  SET dm_sent_at = now()
  WHERE dm_sent_at IS NULL;
