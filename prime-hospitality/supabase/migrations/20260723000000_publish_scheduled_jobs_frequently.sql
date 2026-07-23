-- ==========================================
-- 20260723000000_publish_scheduled_jobs_frequently.sql
-- job-expiration-cron now also publishes scheduled jobs (status 'scheduled'
-- -> 'active') once their scheduled_at time passes. Running it only once a
-- day (06:00 UTC) meant scheduled posts could sit unpublished for up to 24
-- hours after their scheduled time. Bump the cadence to every 5 minutes so
-- posts go live close to when the admin scheduled them.
-- ==========================================

SELECT cron.schedule(
  'job-expiration-cron-daily',
  '*/5 * * * *', -- every 5 minutes
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
