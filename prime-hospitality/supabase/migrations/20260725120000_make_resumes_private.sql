-- Make the resumes bucket private.
--
-- A seeker's CV is meant to be seen by the seeker themselves and by the employers
-- whose jobs they applied to. With a public bucket every CV was readable by anyone
-- holding the URL — no login, no account, forever.
--
-- Reads now go through short-lived signed URLs minted server-side, after the caller
-- has been confirmed to be either the CV's owner or an employer that applicant
-- actually applied to. Uploads are unaffected.

UPDATE storage.buckets SET public = false WHERE id = 'resumes';

-- Remove anonymous read access. Signed URLs and the service role are unaffected by
-- RLS policies, so this only closes the open door.
DROP POLICY IF EXISTS "Public read resumes" ON storage.objects;

-- Logos stay public — they're shown on job cards to everyone browsing.
