-- Lets an admin pre-approve a scheduled job (one whose employer does not
-- have auto_publish) before its scheduled_at time arrives. The job stays in
-- 'scheduled' status -- it still only goes live at the exact scheduled
-- time -- but the job-expiration-cron sweep will route it straight to
-- 'active' instead of 'pending' once that time is reached, since an admin
-- already reviewed it in advance.
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS pre_approved boolean NOT NULL DEFAULT false;
