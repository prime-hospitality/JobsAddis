-- ==========================================
-- 20260727000000_add_expiry_warning_flag.sql
-- Adds a per-employer flag so the job-expiration-cron sweep can send a single
-- "subscription expiring within 24 hours" notification per billing cycle
-- (reset to false whenever an admin reassigns/renews a package), and extends
-- the notifications type check to allow that new notification type.
-- ==========================================

ALTER TABLE public.employers ADD COLUMN IF NOT EXISTS expiry_warning_sent boolean NOT NULL DEFAULT false;

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('shortlisted', 'rejected', 'message', 'job_expiring', 'subscription_expired', 'vacancy_alert', 'new_applicant', 'broadcast', 'subscription_expiring'));
