-- Employer TIN (Ethiopian Taxpayer Identification Number).
--
-- Collected once, during employer onboarding (alongside the password), and
-- from any already-onboarded employer the first time they open the dashboard
-- after this ships. Nullable at the column level because those existing rows
-- have no TIN yet -- "required" is enforced by the dashboard gate, not by a
-- NOT NULL that would break every current employer on deploy.

ALTER TABLE public.employers ADD COLUMN IF NOT EXISTS tin_number text;

-- Exactly 10 digits, matching src/lib/ethiopianTin.ts. The app normalises away
-- the spaces a TIN certificate prints, so only bare digits ever reach here.
ALTER TABLE public.employers DROP CONSTRAINT IF EXISTS employers_tin_number_format;
ALTER TABLE public.employers ADD CONSTRAINT employers_tin_number_format
  CHECK (tin_number IS NULL OR tin_number ~ '^[0-9]{10}$');

COMMENT ON COLUMN public.employers.tin_number IS
  'Ethiopian Taxpayer Identification Number, 10 digits. Admin-visible only -- never granted to anon/authenticated (see the column grants below).';

-- --------------------------------------------------------------------------
-- Keep the TIN away from job seekers.
--
-- public.employers is world-readable ("Employers are viewable by everyone",
-- USING (true)) and the seeker Mini App queries it straight from the browser
-- with the publishable key, so a new column is readable by every seeker the
-- moment it exists. RLS can filter rows but not columns, so the fix is
-- column-level privileges: drop the blanket table SELECT and grant back only
-- the columns the seeker app actually reads through its `employers(...)`
-- embeds (business_name, business_type, logo_url) plus the keys PostgREST
-- needs to resolve those embeds.
--
-- Left out on purpose: tin_number, and also password_hash and
-- authorization_number -- both are employer credentials that were equally
-- readable and that nothing outside the service-role server actions reads.
--
-- NOTE for future migrations: with column grants in place, a newly added
-- column is NOT readable by anon/authenticated until it is granted here. That
-- is the safe default, but it means any new seeker-facing employer column
-- needs its own GRANT.
-- --------------------------------------------------------------------------
REVOKE SELECT ON public.employers FROM anon, authenticated;

GRANT SELECT (
  id,
  user_id,
  business_name,
  business_type,
  status,
  created_at,
  updated_at,
  daily_post_limit,
  logo_url,
  active_package_id,
  package_expires_at,
  renewal_requested,
  renewal_requested_at,
  renewal_seen_at,
  auto_publish,
  description,
  expiry_warning_sent,
  auth_code_attempts,
  auth_code_locked_until
) ON public.employers TO anon, authenticated;
