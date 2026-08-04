-- A job marked as filled stays findable in search.
--
-- "Mark as Filled" sets status='closed' and stamps filled_at, which stops new
-- applications without deleting the post. search_jobs' WHERE clause did not
-- know that, so marking a job filled made it vanish from search outright --
-- the removal the feature exists to avoid. Filled jobs are matched on
-- filled_at IS NOT NULL rather than on status alone, so an admin-moderated
-- close (also 'closed', but with no filled_at) stays hidden as before.
--
-- ---------------------------------------------------------------------------
-- RECONSTRUCTED 2026-08-04. This migration was applied straight to the live
-- database and its file was never committed -- version 20260731140000 sat in
-- supabase_migrations.schema_migrations with no file in any branch.
--
-- Two things were broken by that, both silent:
--   1. `supabase db push` refused for everyone ("Remote migration versions not
--      found in local migrations directory"), because a remote version had no
--      local file. Its suggested fix, `migration repair --status reverted`,
--      would have recorded three real applied migrations as reverted.
--   2. Anyone rebuilding search_jobs from the newest file in this repo would
--      silently revert this change and 20260731130000 with it. That nearly
--      happened on 2026-08-04 while adding gender_preference to the function.
--
-- Recovered by diffing pg_get_functiondef() against 20260731130000: the two
-- differ by exactly the one WHERE line below, so this is the whole change and
-- not an approximation. The rest of the body is 20260731130000 verbatim.
--
-- Applying this file to a fresh database reproduces the live function: it lands
-- after 20260731130000 and before 20260801000000, which later drops and
-- recreates search_jobs to add gender_preference to the return type.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.search_jobs(
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
      j.full_description, j.min_years_experience, j.requirements, j.deadline,
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
    f.full_description, f.min_years_experience, f.requirements, f.deadline,
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
