-- ==========================================
-- 20260608190000_create_notifications.sql
-- Creates the notifications table for shortlist/rejection alerts
-- ==========================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_telegram_id bigint NOT NULL,
  company_name text NOT NULL,
  job_title text NOT NULL,
  type text NOT NULL CHECK (type IN ('shortlisted', 'rejected', 'message')),
  read boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for fast per-user queries
CREATE INDEX IF NOT EXISTS notifications_user_telegram_id_idx
  ON public.notifications (user_telegram_id);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS (used by edge functions).
-- No additional policies needed since all reads/writes go through edge functions.
