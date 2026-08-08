-- When an employer's subscription actually started.
--
-- Admins register a business days (sometimes weeks) after it paid and started
-- using the service. Until now the package window always opened on the day the
-- record was typed into the dashboard, which quietly handed those employers a
-- full fresh term. This column stores the real start date the admin entered,
-- and package_expires_at is derived from it:
--
--   package_expires_at = subscription_started_at + packages.duration_days
--
-- Nullable, and left NULL for every employer created before this ships: their
-- package_expires_at is still the authority on when they lapse, so the honest
-- reading of a missing start is "not recorded", not "the epoch". Backfilling it
-- by subtracting the current package duration would invent a date that no admin
-- ever confirmed.

ALTER TABLE public.employers
  ADD COLUMN IF NOT EXISTS subscription_started_at timestamptz;

COMMENT ON COLUMN public.employers.subscription_started_at IS
  'Real-world date the employer''s current subscription began, entered by an admin at registration. Anchors package_expires_at = subscription_started_at + packages.duration_days. NULL for employers registered before this column existed.';

-- Deliberately NOT added to the anon/authenticated column grants in
-- 20260805000000_add_tin_number_to_employers.sql. Nothing in the seeker or
-- employer Mini App reads this -- they read package_expires_at, which is
-- already granted -- and the safe default for a new employers column is to stay
-- behind the service-role admin actions.
