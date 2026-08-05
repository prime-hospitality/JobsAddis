-- A new notification type: 'posted_for_you'.
--
-- When an admin posts a vacancy on an employer's behalf (the admin dashboard's
-- PFE tab -- see 20260804000000_add_posted_by_admin_to_jobs), the employer is
-- told, because a job appearing under their name that they never typed is
-- otherwise alarming rather than helpful. Their bell renders it as
-- "JobsAddis posted <title> for you."
--
-- notifications.type is whitelisted by a CHECK constraint, so a type that isn't
-- listed is rejected at insert. That rejection would have been invisible in
-- practice: the notify call is deliberately non-fatal (the job is already live
-- by the time it runs, so there is nothing to roll back to), meaning a missing
-- type would have silently dropped every one of these notices with the post
-- still reported as a success. Widening the constraint is what makes the
-- feature actually work, not a formality.
--
-- The new list is a superset of the old one, so every existing row still
-- passes and no backfill or data migration is needed.

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY[
    'shortlisted'::text,
    'rejected'::text,
    'message'::text,
    'job_expiring'::text,
    'subscription_expired'::text,
    'vacancy_alert'::text,
    'new_applicant'::text,
    'broadcast'::text,
    'subscription_expiring'::text,
    'posted_for_you'::text
  ]));

-- The list above was read from the LIVE constraint with pg_get_constraintdef()
-- rather than rebuilt from an older migration in this repo, for the same reason
-- the search_jobs rebuild had to be: types have been added here over time and
-- some of those changes were applied straight to the database. Reconstructing
-- the list from git would silently drop whichever ones never got a file.
