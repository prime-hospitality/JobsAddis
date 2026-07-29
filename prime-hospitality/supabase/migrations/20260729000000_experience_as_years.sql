-- Experience becomes a year count instead of a seniority label.
--
-- Hospitality titles are relative to the property that awarded them: two years
-- at a large hotel is that hotel's "junior", and the same two years are a
-- manager-grade hire at a small restaurant. Storing the employer's judgement
-- made the value meaningless the moment it left that employer. Years travel.
--
-- This also collapses four incompatible scales that were live at once:
--   * onboarding wrote  "No Experience" / "1 to 2 years" / "5+ years"
--   * the profile editor wrote "Junior Level(1-3 years)" / "Mid Level(3-5 years)"
--     -- into the SAME profiles.experience_levels column
--   * the employer form wrote "Entry level" / "Junior" / "Senior"
--   * buildRequirementsJson defaulted to "Entry Level", disagreeing on casing
--     with its own option list
-- Nothing at the DB layer constrained any of it, and the vacancy-alert matcher
-- compared values across two of these scales with string equality.
--
-- Old columns are left in place, unread and unwritten, as a rollback net. A
-- follow-up migration drops them once this is stable in production.

-- ---------------------------------------------------------------------------
-- Seeker side
-- ---------------------------------------------------------------------------

-- role -> years, e.g. {"Waiter": 3}. Mirrors the shape of experience_levels so
-- a seeker with 6 years as a Waiter and 0 as a Barista stays representable.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS experience_years jsonb NOT NULL DEFAULT '{}'::jsonb;

-- role -> kind of establishment those years were earned at, e.g.
-- {"Waiter": "Hotel"}. Free text matching employers.business_type, not an FK:
-- the business_types lookup is itself extensible via "Other".
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS experience_context jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Caps how much experience an alerted job may ask for. NULL = alert me about
-- anything, matching the old NULL-means-any behaviour of alert_experience_level.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS alert_max_years integer;

-- experience_levels is `jsonb NOT NULL` with no default (00001_initial_schema).
-- Now that nothing writes it, every profile INSERT would fail on a not-null
-- violation and onboarding would break outright. Give it a default so the
-- retired column stays harmless until the follow-up migration drops it.
ALTER TABLE public.profiles
  ALTER COLUMN experience_levels SET DEFAULT '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- Job side
-- ---------------------------------------------------------------------------

-- Promoted out of the `requirements` jsonb into a real column: the search
-- filter is now a numeric range, which inside jsonb would need a cast plus a
-- functional index and would still carry no type safety. NULL = no minimum
-- stated, which reads as "any" everywhere rather than as zero.
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS min_years_experience integer;

ALTER TABLE public.vacancy_templates
  ADD COLUMN IF NOT EXISTS min_years_experience integer;

ALTER TABLE public.employer_vacancy_templates
  ADD COLUMN IF NOT EXISTS min_years_experience integer;

-- Seekers only ever filter active jobs, so the partial index stays small.
CREATE INDEX IF NOT EXISTS jobs_min_years_experience_idx
  ON public.jobs (min_years_experience)
  WHERE status = 'active';

-- 00001_initial_schema documents `requirements` as { experience, education, ... }.
-- `experience` has moved out to its own column; restate the shape so the schema
-- does not keep describing a key nothing writes.
COMMENT ON COLUMN public.jobs.requirements IS
  '{ education, languages, locationPreference, workingHours } -- experience moved to jobs.min_years_experience';

-- ---------------------------------------------------------------------------
-- Backfill: conservative floor mapping
-- ---------------------------------------------------------------------------
--
-- Every legacy label maps to the LOWEST year count it could have meant, so the
-- migration can never exclude someone from a job they actually qualify for.
-- Deliberately lossy -- "Senior" never carried a year value, and inventing one
-- would fabricate precision the old data never had.
--
-- Anything unrecognised is left NULL rather than 0. A string we failed to parse
-- means we do not know; asserting "no experience" about that person would be
-- worse than admitting the gap, and NULL already renders as "not specified".
--
-- Keys are lowercased and whitespace-collapsed because the old writers
-- disagreed on casing. Kept in step with legacyExperienceToYears() in
-- src/lib/vocabulary.ts.

-- A real (not pg_temp) function, dropped at the end of this file. A temp
-- function would be scoped to the session, which is not guaranteed to survive
-- if the migration runner reconnects or runs through a transaction-mode pooler.
CREATE OR REPLACE FUNCTION public.__legacy_experience_to_years(label text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE regexp_replace(btrim(lower(label)), '\s+', ' ', 'g')
    WHEN 'entry level'                   THEN 0
    WHEN 'entry level (fresh graduate)'  THEN 0
    WHEN 'no experience'                 THEN 0
    WHEN 'less than 1 year'              THEN 0
    WHEN 'junior'                        THEN 1
    WHEN 'junior level(1-3 years)'       THEN 1
    WHEN '1 to 2 years'                  THEN 1
    WHEN 'intermediate'                  THEN 3
    WHEN 'mid level'                     THEN 3
    WHEN 'mid level(3-5 years)'          THEN 3
    WHEN '3 to 5 years'                  THEN 3
    WHEN 'senior'                        THEN 5
    WHEN 'senior level'                  THEN 5
    WHEN 'senior(5-8 years)'             THEN 5
    WHEN '5+ years'                      THEN 5
    WHEN 'expert'                        THEN 8
    WHEN 'executive(vp, director)'       THEN 8
    WHEN 'senior executive(c level)'     THEN 10
    ELSE NULL
  END;
$$;

-- Jobs: requirements->>'experience' -> min_years_experience
UPDATE public.jobs
SET min_years_experience = public.__legacy_experience_to_years(requirements->>'experience')
WHERE min_years_experience IS NULL
  AND requirements->>'experience' IS NOT NULL;

-- Both template tables carried the same label list.
UPDATE public.vacancy_templates
SET min_years_experience = public.__legacy_experience_to_years(experience_required)
WHERE min_years_experience IS NULL
  AND experience_required IS NOT NULL;

UPDATE public.employer_vacancy_templates
SET min_years_experience = public.__legacy_experience_to_years(experience_required)
WHERE min_years_experience IS NULL
  AND experience_required IS NOT NULL;

-- Profiles: the per-role map, converted entry by entry. Roles whose label does
-- not resolve are dropped from the new map rather than defaulted, so they show
-- as unset and prompt the seeker to fill them in.
UPDATE public.profiles p
SET experience_years = COALESCE(converted.map, '{}'::jsonb)
FROM (
  SELECT
    id,
    jsonb_object_agg(role, to_jsonb(years)) FILTER (WHERE years IS NOT NULL) AS map
  FROM (
    SELECT
      id,
      kv.key AS role,
      public.__legacy_experience_to_years(kv.value #>> '{}') AS years
    FROM public.profiles, LATERAL jsonb_each(experience_levels) AS kv
    WHERE jsonb_typeof(experience_levels) = 'object'
  ) AS pairs
  GROUP BY id
) AS converted
WHERE p.id = converted.id
  AND p.experience_years = '{}'::jsonb;

-- experience_context stays '{}' -- where historical years were earned is
-- genuinely unknowable, and a guess would be worse than an honest blank.

-- Alert preference: the stored value came from the job-side label list.
UPDATE public.profiles
SET alert_max_years = public.__legacy_experience_to_years(alert_experience_level)
WHERE alert_max_years IS NULL
  AND alert_experience_level IS NOT NULL;

-- The seeker-editable onboarding list is obsolete: the years scale is fixed
-- (0..10+), not admin-authored, so leaving the key would let an admin edit a
-- control that no longer reads it.
DELETE FROM public.onboarding_config WHERE key = 'step3_experience_levels';

-- The conversion helper exists only for this backfill.
DROP FUNCTION IF EXISTS public.__legacy_experience_to_years(text);
