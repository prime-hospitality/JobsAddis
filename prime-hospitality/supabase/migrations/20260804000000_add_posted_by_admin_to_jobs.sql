-- An admin can post a vacancy on an employer's behalf ("PFE" -- Post For
-- Employer, in the admin dashboard under Employers & Companies > Emp Config).
--
-- The job produced that way is a completely ordinary employer job: it carries
-- the employer's id, so the seeker sees the hotel's name and logo, the employer
-- manages its applicants from their own dashboard, and the group announcer
-- picks it up like any other. Nothing about it is special-cased anywhere on the
-- seeker side or the employer side.
--
-- What this column adds is only an answer to "who typed it in", which the admin
-- dashboard needs for three things and the rest of the app needs for none:
--
--   1. Grouping the PFE tab's list by employer, which would otherwise have to
--      list every job the employer ever posted and become a second copy of the
--      Job Posting Moderation tab.
--   2. The "posted by <admin>" byline on those rows, so a second admin doesn't
--      re-post a vacancy an hour after the first one did.
--   3. Telling apart "the employer forgot to renew and we posted for them" from
--      normal employer activity when reading back the history.
--
-- The admin's username, not their id: sub-admins live in an app_config JSON
-- blob keyed by username with no stable id column to reference, and the same
-- string is already what activity_log.actor records for every other admin
-- action. This stays consistent with that trail.

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS posted_by_admin text;

COMMENT ON COLUMN public.jobs.posted_by_admin IS
  'Admin username when this job was posted on the employer''s behalf from the admin dashboard''s PFE tab; NULL when the employer posted it themselves. Read by the admin dashboard only -- no seeker-side or employer-side query filters on it, so a PFE job can never be hidden from the employer who owns it.';

-- No backfill: every existing row was posted by its own employer, and NULL
-- already reads as exactly that.
--
-- No index. The only query that filters on it is the PFE tab's grouped list,
-- which an admin opens by hand a few times a day over a table that also carries
-- an employer_id predicate. An index here would serve nothing else.
--
-- No change to search_jobs(). The seeker never sees this and must not be able
-- to sort or filter by it -- who typed a vacancy in is not a property of the
-- job that anyone applying to it has an interest in.
