-- =============================================================================
-- Migration: 20260905180000_track_announcement_edits.sql
-- Sync job edits made by employers to existing Telegram group announcements.
-- =============================================================================

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS announcement_needs_update BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.jobs.announcement_needs_update IS
  'Set to TRUE when an announced job is edited, so the cron sweep updates the Telegram group post.';

CREATE OR REPLACE FUNCTION public.queue_announcement_edit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.announced_message_id IS NOT NULL AND (
     OLD.title IS DISTINCT FROM NEW.title OR
     OLD.salary_min IS DISTINCT FROM NEW.salary_min OR
     OLD.salary_max IS DISTINCT FROM NEW.salary_max OR
     OLD.job_type IS DISTINCT FROM NEW.job_type OR
     OLD.quantity IS DISTINCT FROM NEW.quantity OR
     OLD.deadline IS DISTINCT FROM NEW.deadline OR
     OLD.description IS DISTINCT FROM NEW.description OR
     OLD.min_years_experience IS DISTINCT FROM NEW.min_years_experience OR
     OLD.gender_preference IS DISTINCT FROM NEW.gender_preference
  ) THEN
    NEW.announcement_needs_update := TRUE;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS jobs_queue_announcement_edit ON public.jobs;
CREATE TRIGGER jobs_queue_announcement_edit
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_announcement_edit();
