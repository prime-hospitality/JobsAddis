-- Bonus posting days: a grant an admin attaches to an employer that only
-- starts counting once the paid subscription it sits behind has run out.
--
-- The rule the feature has to honour is "the bonus IS the subscription, for
-- longer": an employer on a premium 30-a-day package posts on their bonus days
-- exactly the way they posted the day before. Every gate in the product --
-- posting, reposting, extending a deadline, seeing new applicants, the
-- group-boost allowance, the admin's post-for-employer tab, the Telegram
-- surface -- already answers that question by comparing package_expires_at
-- against now() and reading the package the employer still holds. So the bonus
-- is applied by pushing package_expires_at forward and touching nothing else:
-- no new gate to write, and no existing gate that can be forgotten.
-- active_package_id and daily_post_limit are deliberately left alone, and that
-- is what makes the bonus term inherit the ended term's rules for free.
--
-- Four columns, because "how many days are owed" and "which term is running"
-- are different questions and the billing page has to answer both:
--
--   bonus_days         the bank -- granted, not yet started. This is the number
--                      an admin types into Employer Settings.
--   bonus_started_at   when the running bonus term opened (NULL: none is).
--   bonus_expires_at   when it closes. Equal to package_expires_at for as long
--                      as the term runs, which is what makes it the extension
--                      rather than a parallel clock that could disagree.
--   bonus_days_active  how long the running term is, so "4 of 10 days left"
--                      can be shown without re-deriving it from timestamps.

ALTER TABLE public.employers
  ADD COLUMN IF NOT EXISTS bonus_days integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS bonus_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS bonus_days_active integer NOT NULL DEFAULT 0;

-- 365 is the longest package sold, so a bonus longer than that is a typo
-- (someone meaning 30 and hitting a key twice), not a grant. The admin form
-- refuses the same range; this is the backstop for anything that isn't the
-- form.
ALTER TABLE public.employers DROP CONSTRAINT IF EXISTS employers_bonus_days_range;
ALTER TABLE public.employers
  ADD CONSTRAINT employers_bonus_days_range
  CHECK (bonus_days BETWEEN 0 AND 365 AND bonus_days_active BETWEEN 0 AND 365);

COMMENT ON COLUMN public.employers.bonus_days IS
  'Banked bonus posting days, granted by an admin and not yet started. Moves to bonus_days_active (and extends package_expires_at) when the current term lapses.';
COMMENT ON COLUMN public.employers.bonus_expires_at IS
  'End of the running bonus term. Mirrors package_expires_at while the term runs -- the bonus is an extension of the subscription, not a separate clock.';

-- The sweep below runs every minute and would otherwise scan the whole table
-- to find the handful of employers with a bank waiting.
CREATE INDEX IF NOT EXISTS employers_pending_bonus_idx
  ON public.employers (package_expires_at)
  WHERE bonus_days > 0;

-- Deliberately NOT added to the anon/authenticated column grants in
-- 20260805000000_add_tin_number_to_employers.sql. Nothing in the seeker or
-- employer Mini App reads these -- the employer's billing page is a server
-- component holding the service-role key, and every posting gate reads
-- package_expires_at, which is already granted.

-- ---------------------------------------------------------------------------
-- Starting a bonus term
-- ---------------------------------------------------------------------------
-- Set-based and idempotent: the WHERE clause is the claim, so two overlapping
-- sweeps cannot start the same bonus twice -- the second finds bonus_days = 0.
--
-- The term is anchored to now(), NOT to the package_expires_at it follows, and
-- the difference is not cosmetic. Bonus days are routinely granted to an
-- employer who lapsed a fortnight ago -- that is exactly the business whose arm
-- gets twisted into a few free days -- and anchoring to their old expiry would
-- charge the whole grant against a fortnight in which they could not post,
-- handing them a bonus that was over before it began. A grant of ten days has
-- to be ten days from the moment it opens.
--
-- The cost of now() is the drift between a term ending and this running: at
-- most the minute between sweeps, and none at all for the employer themselves,
-- because their own dashboard reads call this with their id first. A minute is
-- nothing against a term measured in days, and nothing downstream reads the
-- time of day out of package_expires_at -- the deadline cap takes the date
-- half, and every other gate is a plain "is it past yet".
--
-- expiry_warning_sent is cleared so the existing 24h "expiring soon" warning
-- fires once more, before the bonus itself runs out.
CREATE OR REPLACE FUNCTION public.activate_due_bonus_days(p_employer_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $fn$
  WITH started AS (
    UPDATE public.employers AS e
    SET
      bonus_started_at    = now(),
      bonus_expires_at    = now() + make_interval(days => e.bonus_days),
      package_expires_at  = now() + make_interval(days => e.bonus_days),
      bonus_days_active   = e.bonus_days,
      bonus_days          = 0,
      expiry_warning_sent = false
    WHERE e.bonus_days > 0
      -- An employer who never had a package has no term for a bonus to follow,
      -- so their bank waits rather than inventing a start date for it.
      AND e.package_expires_at IS NOT NULL
      AND e.package_expires_at <= now()
      AND (p_employer_id IS NULL OR e.id = p_employer_id)
    RETURNING e.id, e.user_id, e.bonus_days_active AS days, e.bonus_expires_at AS ends_at
  ),
  logged AS (
    INSERT INTO public.activity_log (actor, action, target, metadata)
    SELECT 'system', 'bonus_days_started', s.id::text,
           jsonb_build_object('days', s.days, 'endsAt', s.ends_at)
    FROM started s
    RETURNING 1
  ),
  notified AS (
    INSERT INTO public.notifications (user_telegram_id, company_name, job_title, type, read)
    SELECT u.telegram_id, 'System', 'Bonus Days Started', 'bonus_started', false
    FROM started s
    JOIN public.users u ON u.id = s.user_id
    WHERE u.telegram_id IS NOT NULL
    RETURNING 1
  )
  SELECT count(*)::integer FROM started;
$fn$;

COMMENT ON FUNCTION public.activate_due_bonus_days(uuid) IS
  'Opens a bonus term for every employer whose subscription has lapsed with banked bonus days (or just the one passed in). Returns how many were started.';

-- EXECUTE is granted to PUBLIC by default, and this function moves an
-- employer's expiry date. It belongs to the every-minute sweep and to the
-- server actions, both of which hold the service-role key.
REVOKE ALL ON FUNCTION public.activate_due_bonus_days(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_due_bonus_days(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- The employer is told when their bonus opens.
-- ---------------------------------------------------------------------------
-- notifications.type is whitelisted by a CHECK constraint, so an unlisted type
-- is rejected at insert -- and that insert sits in a CTE of the activation
-- statement above, which means a missing type would fail the activation itself
-- rather than just dropping the notice. The list below is the live one (read
-- with pg_get_constraintdef, same as 20260805010000) plus 'bonus_started'.
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
    'posted_for_you'::text,
    'bonus_started'::text
  ]));
