-- ==========================================
-- 20260723000000_publish_scheduled_jobs_frequently.sql
-- job-expiration-cron resolves scheduled jobs (status 'scheduled') once their
-- scheduled_at time passes: it publishes them live ('active') when the owning
-- employer may post without review (employers.auto_publish = true), otherwise
-- it sends them for moderation ('pending'). Running the sweep only once a day
-- (06:00 UTC) meant scheduled posts could sit unresolved for up to 24 hours.
-- Run it every minute instead so posts resolve on their scheduled minute.
-- (pg_cron is minute-granular, matching the minute-precision schedule picker;
-- sub-minute precision is neither achievable here nor needed.)
-- Note: the cron job keeps its historical name 'job-expiration-cron-daily'
-- (cron.schedule upserts by name) even though it is no longer daily.
-- ==========================================

SELECT cron.schedule(
  'job-expiration-cron-daily',
  '* * * * *', -- every minute
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
