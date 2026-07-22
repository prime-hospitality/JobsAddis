-- ==========================================
-- 20260722020000_add_broadcast_activity_log_cron.sql
-- Adds new_applicant/broadcast notification types, activity_log table,
-- backfills the notifications.job_id column (referenced in code but never
-- migrated), and schedules the job-expiration-cron edge function via pg_cron.
-- ==========================================

-- 1. Backfill notifications.job_id (code at validate-telegram-auth/index.ts
--    inserts job_id for vacancy_alert rows, but no prior migration added the
--    column -- add it defensively so it's guaranteed to exist either way).
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS notifications_job_id_idx ON public.notifications (job_id);

-- 2. Extend notifications type check for employer new-applicant alerts and
--    admin broadcasts.
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('shortlisted', 'rejected', 'message', 'job_expiring', 'subscription_expired', 'vacancy_alert', 'new_applicant', 'broadcast'));

-- 3. Activity log for key privileged admin actions (E.2).
CREATE TABLE IF NOT EXISTS public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor text NOT NULL,
  action text NOT NULL,
  target text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS activity_log_created_at_idx ON public.activity_log (created_at DESC);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
-- No public policies: only the service-role key (used by admin server actions) can read/write.

-- 4. Schedule job-expiration-cron to run daily via pg_cron + pg_net.
-- Requires the project's service role key to be stored as a Vault secret
-- named 'service_role_key' (set once via the Supabase Dashboard -> Vault,
-- or `select vault.create_secret('<key>', 'service_role_key')`) so this
-- migration itself never contains a live secret.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'job-expiration-cron-daily',
  '0 6 * * *', -- 06:00 UTC daily
  $$
  SELECT net.http_post(
    url := 'https://rrypxbkipixmuufzkdxp.supabase.co/functions/v1/job-expiration-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
