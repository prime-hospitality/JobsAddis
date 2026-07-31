-- "Mark as Filled" reuses the existing 'closed' status (already excluded from
-- every seeker-facing query the same way 'expired' is) rather than adding a
-- new status string. filled_at distinguishes "employer marked this filled"
-- from an admin-moderated close (stays null for that case), and doubles as
-- a free audit timestamp.
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS filled_at timestamptz;
