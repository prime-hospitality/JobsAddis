-- Jobs can state that they are hiring one gender only.
--
-- Hospitality employers in Addis routinely advertise a role as female-only or
-- male-only -- a women's spa, a male night-security shift -- and until now that
-- requirement was typed into the free-text description, where nothing could
-- read it. A seeker only found out after applying.
--
-- Modelled exactly like min_years_experience, and for the same reason: it is a
-- stated fact about the job, so it gets a real column rather than a key inside
-- the `requirements` jsonb, and everything the app does with it is advisory.
-- Nothing here blocks an application, hides a job, or filters a feed -- the
-- seeker is told what the employer asked for and decides for themselves.
--
-- NULL is the default and means the employer never restricted the role. It is
-- deliberately NOT 'any': "open to anyone" is the absence of a requirement, not
-- a requirement, so the job detail screen prints nothing at all for it rather
-- than a row saying "Any". Only 'male' and 'female' are storable, which is what
-- the seeker side records (profiles.gender, written by onboarding).

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS gender_preference text;

ALTER TABLE public.vacancy_templates
  ADD COLUMN IF NOT EXISTS gender_preference text;

ALTER TABLE public.employer_vacancy_templates
  ADD COLUMN IF NOT EXISTS gender_preference text;

-- A CHECK rather than an enum: the app already stores gender as free text on
-- profiles, and an enum here would need a type migration the first time that
-- vocabulary changes. NULL passes the check, which is the point.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'jobs_gender_preference_check') THEN
    ALTER TABLE public.jobs
      ADD CONSTRAINT jobs_gender_preference_check
      CHECK (gender_preference IN ('male', 'female'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vacancy_templates_gender_preference_check') THEN
    ALTER TABLE public.vacancy_templates
      ADD CONSTRAINT vacancy_templates_gender_preference_check
      CHECK (gender_preference IN ('male', 'female'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employer_vacancy_templates_gender_preference_check') THEN
    ALTER TABLE public.employer_vacancy_templates
      ADD CONSTRAINT employer_vacancy_templates_gender_preference_check
      CHECK (gender_preference IN ('male', 'female'));
  END IF;
END $$;

COMMENT ON COLUMN public.jobs.gender_preference IS
  'male | female | NULL. NULL = open to anyone and is never rendered. Advisory only -- never gates an application.';

-- No index and no backfill. There is no gender filter on the seeker search --
-- an index would serve no query -- and the historical requirement, where it was
-- stated at all, lives in prose inside `description` that we cannot parse
-- without guessing. A wrong guess here excludes a real person from a real job,
-- so old rows stay NULL and read as open to anyone.

-- ---------------------------------------------------------------------------
-- search_jobs must return the new column
-- ---------------------------------------------------------------------------
-- The seeker's Search tab maps RPC rows through the same mapSupabaseJobToJob()
-- as the home feed. A column missing here does not error -- the mapper
-- coalesces it away -- so a female-only job would simply look unrestricted when
-- reached through search and restricted when reached through the feed. Same
-- trap min_years_experience and last_posted_at fell into before.
--
-- Dropped and recreated rather than CREATE OR REPLACE: the argument list is
-- unchanged but the return type is not, and Postgres refuses to replace a
-- function whose OUT columns differ.
--
-- The body below was pulled from the LIVE function with pg_get_functiondef,
-- not copied from the newest migration file in this repo. Two later migrations
-- (20260731130000_search_includes_expired, 20260731140000_search_includes_filled)
-- widened the status predicate to keep expired and filled jobs searchable, and
-- 20260731140000 has no file in this repo at all -- it was applied straight to
-- the database. Rebuilding from the repo would have silently reverted both.


DROP FUNCTION IF EXISTS public.search_jobs(
  text, text[], text[], text[], int[], text[], timestamptz, int, int
);

CREATE FUNCTION public.search_jobs(
  p_keyword            text        DEFAULT NULL,
  p_keyword_categories text[]      DEFAULT NULL,
  p_categories         text[]      DEFAULT NULL,
  p_business_types     text[]      DEFAULT NULL,
  p_years              int[]       DEFAULT NULL,
  p_locations          text[]      DEFAULT NULL,
  p_posted_after       timestamptz DEFAULT NULL,
  p_limit              int         DEFAULT 20,
  p_offset             int         DEFAULT 0
)
RETURNS TABLE (
  id                   uuid,
  employer_id          uuid,
  title                text,
  category             text,
  location             text,
  neighborhood         text,
  job_type             text,
  salary_min           integer,
  salary_max           integer,
  currency             text,
  description          text,
  full_description     text,
  min_years_experience integer,
  gender_preference    text,
  requirements         jsonb,
  deadline             timestamptz,
  status               text,
  created_at           timestamptz,
  last_posted_at       timestamptz,
  quantity             integer,
  business_name        text,
  business_type        text,
  logo_url             text,
  relevance            real,
  total_count          bigint
)
LANGUAGE sql
STABLE
SET search_path = public, extensions, pg_temp
AS $$
  WITH kw AS (
    SELECT
      public.search_norm(p_keyword) AS q,
      -- Below this length, only exact and prefix matches count.
      length(public.search_norm(p_keyword)) >= 3 AS allow_contains
  ),
  scored AS (
    SELECT
      j.id, j.employer_id, j.title, j.category, j.location, j.neighborhood,
      j.job_type, j.salary_min, j.salary_max, j.currency, j.description,
      j.full_description, j.min_years_experience, j.gender_preference,
      j.requirements, j.deadline,
      j.status, j.created_at, j.last_posted_at, j.quantity,
      e.business_name, e.business_type, e.logo_url,
      CASE
        WHEN (SELECT q FROM kw) = '' THEN 0::real
        ELSE GREATEST(
          -- Exact and prefix title matches outrank everything.
          CASE
            WHEN public.search_norm(j.title) = (SELECT q FROM kw)                  THEN 1.00
            WHEN public.search_norm(j.title) LIKE (SELECT q FROM kw) || '%'        THEN 0.92
            WHEN (SELECT allow_contains FROM kw)
             AND public.search_norm(j.title) LIKE '%' || (SELECT q FROM kw) || '%' THEN 0.85
            ELSE 0
          END,
          -- The keyword resolved to this job's role via the taxonomy. This is
          -- what makes "waiter" find a job titled "Night shift waitress", and
          -- what carries Amharic and multi-word synonyms like "front desk".
          CASE
            WHEN p_keyword_categories IS NOT NULL
             AND j.category = ANY(p_keyword_categories)                            THEN 0.80
            ELSE 0
          END,
          -- Typo tolerance. word_similarity, not similarity: the latter scores
          -- the keyword against the whole title, so a short keyword inside a
          -- long title always scores near zero.
          CASE
            WHEN (SELECT allow_contains FROM kw)
            THEN extensions.word_similarity((SELECT q FROM kw), public.search_norm(j.title))
            ELSE 0
          END,
          CASE
            WHEN (SELECT allow_contains FROM kw)
            THEN extensions.word_similarity((SELECT q FROM kw), public.search_norm(j.category))
            ELSE 0
          END,
          CASE
            WHEN (SELECT allow_contains FROM kw)
             AND public.search_norm(e.business_name) LIKE '%' || (SELECT q FROM kw) || '%' THEN 0.60
            ELSE 0
          END,
          CASE
            WHEN (SELECT allow_contains FROM kw)
             AND (public.search_norm(j.neighborhood) LIKE '%' || (SELECT q FROM kw) || '%'
               OR public.search_norm(j.location)     LIKE '%' || (SELECT q FROM kw) || '%') THEN 0.55
            ELSE 0
          END,
          -- Lowest weight by design: descriptions carry responsibilities and
          -- benefits, so common words hit almost everything. Before this change
          -- a description hit was indistinguishable from a title hit -- which is
          -- how searching "hotel" surfaced a telephone operator role.
          CASE
            WHEN (SELECT allow_contains FROM kw)
             AND public.search_norm(j.description) LIKE '%' || (SELECT q FROM kw) || '%'    THEN 0.30
            ELSE 0
          END
        )::real
      END AS relevance
    FROM public.jobs j
    JOIN public.employers e ON e.id = j.employer_id
    WHERE (j.status IN ('active', 'expired') OR (j.status = 'closed' AND j.filled_at IS NOT NULL))
      AND (p_categories     IS NULL OR cardinality(p_categories)     = 0 OR j.category             = ANY(p_categories))
      AND (p_business_types IS NULL OR cardinality(p_business_types) = 0 OR e.business_type        = ANY(p_business_types))
      AND (p_years          IS NULL OR cardinality(p_years)          = 0 OR j.min_years_experience = ANY(p_years))
      AND (p_locations      IS NULL OR cardinality(p_locations)      = 0
           OR j.location = ANY(p_locations) OR j.neighborhood = ANY(p_locations))
      AND (p_posted_after IS NULL OR j.created_at >= p_posted_after)
      -- Deliberately no gender_preference predicate. A female-only job stays
      -- in a male seeker's results and is labelled there; filtering it out
      -- would make the platform decide who may see which vacancy.
  ),
  filtered AS (
    -- 0.32 keeps a genuine typo ("wiater" -> "waiter") while dropping the
    -- coincidental two-trigram overlaps that otherwise fill a short query's
    -- results with noise.
    SELECT * FROM scored
    WHERE (SELECT q FROM kw) = '' OR relevance >= 0.32
  )
  SELECT
    f.id, f.employer_id, f.title, f.category, f.location, f.neighborhood,
    f.job_type, f.salary_min, f.salary_max, f.currency, f.description,
    f.full_description, f.min_years_experience, f.gender_preference,
    f.requirements, f.deadline,
    f.status, f.created_at, f.last_posted_at, f.quantity,
    f.business_name, f.business_type, f.logo_url,
    f.relevance,
    count(*) OVER () AS total_count
  FROM filtered f
  ORDER BY f.relevance DESC, f.last_posted_at DESC NULLS LAST, f.created_at DESC
  LIMIT  COALESCE(p_limit, 20)
  OFFSET COALESCE(p_offset, 0);
$$;

GRANT EXECUTE ON FUNCTION public.search_jobs(
  text, text[], text[], text[], int[], text[], timestamptz, int, int
) TO anon, authenticated;
