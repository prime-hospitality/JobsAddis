-- Make the seeker search bar actually find jobs.
--
-- Before this, the query matched only title/description/neighborhood plus the
-- employer name, with a plain ILIKE '%term%'. Measured against live data, that
-- meant:
--
--   "waiter"  -> 0 hits, despite an active job with category = 'Waiter'
--                (its title reads "Night shift waitress", and "waiter" is not
--                 a substring of "waitress")
--   "cafe"    -> 0 hits, while "café" found "Café Supervisor"
--   "wiater"  -> 0 hits (no typo tolerance at all)
--   "አስተናጋጅ"  -> 0 hits (no Amharic, though every role carries a nameAm)
--
-- Three things were missing and are added here: the job's own category was
-- never searched, there was no fuzzy matching, and results came back ordered by
-- date so an exact title match sorted below a newer job that merely mentioned
-- the word once in its description.

-- pg_trgm gives word_similarity(), which scores a keyword against the best
-- matching run of words inside a longer string -- the right shape for "does
-- this keyword appear, roughly, in this title". Supabase keeps extensions in
-- their own schema.
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- Normalisation
-- ---------------------------------------------------------------------------

-- Lowercases and strips Latin accents so "cafe" matches "Café".
--
-- translate() rather than the unaccent extension: unaccent's dictionary lookup
-- is only STABLE, so indexing it needs a wrapper and a schema-qualified
-- regdictionary that breaks if the extension lands in a different schema.
-- Latin-1 accents are the entire realistic surface here (Café, résumé), and
-- this stays trivially IMMUTABLE. lower() already folds uppercase accented
-- letters, so only the lowercase forms need listing.
--
-- Amharic passes through untouched: it has no case and no combining accents,
-- so ግዕዝ text compares as-is.
CREATE OR REPLACE FUNCTION public.search_norm(txt text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT translate(
    lower(coalesce(txt, '')),
    'áàâäãåéèêëíìîïóòôöõúùûüçñ',
    'aaaaaaeeeeiiiiooooouuuucn'
  );
$$;

-- Trigram indexes over the normalised text the ranking actually reads.
-- Partial on active jobs: seekers never search anything else, and it keeps the
-- index small as expired postings accumulate.
CREATE INDEX IF NOT EXISTS jobs_title_trgm_idx
  ON public.jobs USING gin (public.search_norm(title) extensions.gin_trgm_ops)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS jobs_category_trgm_idx
  ON public.jobs USING gin (public.search_norm(category) extensions.gin_trgm_ops)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS employers_business_name_trgm_idx
  ON public.employers USING gin (public.search_norm(business_name) extensions.gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Data fix: a category no filter could reach
-- ---------------------------------------------------------------------------
-- Two jobs were stored as 'ICT', which is not a role in src/data/job-categories.ts
-- (the canonical name is 'IT Officer'). The Category filter builds its options
-- from that list, so those jobs were unreachable through it -- one of them
-- active. Same class of drift the taxonomy consolidation already fixed for
-- 'Reception'.
UPDATE public.jobs SET category = 'IT Officer' WHERE category = 'ICT';

-- ---------------------------------------------------------------------------
-- search_jobs
-- ---------------------------------------------------------------------------
-- One round trip replacing the previous two (the employer-name lookup used to
-- run as a separate query before the main one), and one place where matching
-- and ranking live.
--
-- SECURITY INVOKER (the default) on purpose: `jobs` and `employers` are both
-- publicly SELECT-able under RLS, and keeping the caller's rights means this
-- cannot become a way to read past a future policy change.
--
-- p_keyword_categories is the set of role names the typed keyword resolves to,
-- worked out client-side from the taxonomy in src/data/job-categories.ts --
-- that file already carries per-role synonyms ("front desk" -> Receptionist,
-- "waitress" -> Waiter) and an Amharic name for all 44 roles. Passing it in
-- rather than duplicating the taxonomy in SQL keeps one copy of it.
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
    SELECT public.search_norm(p_keyword) AS q
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
            WHEN public.search_norm(j.title) = (SELECT q FROM kw)                        THEN 1.00
            WHEN public.search_norm(j.title) LIKE (SELECT q FROM kw) || '%'              THEN 0.92
            WHEN public.search_norm(j.title) LIKE '%' || (SELECT q FROM kw) || '%'       THEN 0.85
            ELSE 0
          END,
          -- The keyword resolved to this job's role via the taxonomy. This is
          -- what makes "waiter" find a job titled "Night shift waitress", and
          -- what carries Amharic and multi-word synonyms like "front desk".
          CASE
            WHEN p_keyword_categories IS NOT NULL
             AND j.category = ANY(p_keyword_categories)                                  THEN 0.80
            ELSE 0
          END,
          -- Typo tolerance. word_similarity, not similarity: the latter scores
          -- the keyword against the whole title, so a short keyword inside a
          -- long title always scores near zero.
          extensions.word_similarity((SELECT q FROM kw), public.search_norm(j.title)),
          extensions.word_similarity((SELECT q FROM kw), public.search_norm(j.category)),
          CASE
            WHEN public.search_norm(e.business_name) LIKE '%' || (SELECT q FROM kw) || '%' THEN 0.60
            ELSE 0
          END,
          CASE
            WHEN public.search_norm(j.neighborhood) LIKE '%' || (SELECT q FROM kw) || '%'
              OR public.search_norm(j.location)     LIKE '%' || (SELECT q FROM kw) || '%'  THEN 0.55
            ELSE 0
          END,
          -- Lowest weight by design: descriptions carry responsibilities and
          -- benefits, so common words hit almost everything. Before this change
          -- a description hit was indistinguishable from a title hit -- which is
          -- how searching "hotel" surfaced a telephone operator role.
          CASE
            WHEN public.search_norm(j.description) LIKE '%' || (SELECT q FROM kw) || '%'   THEN 0.30
            ELSE 0
          END
        )::real
      END AS relevance
    FROM public.jobs j
    JOIN public.employers e ON e.id = j.employer_id
    WHERE j.status = 'active'
      AND (p_categories     IS NULL OR cardinality(p_categories)     = 0 OR j.category         = ANY(p_categories))
      AND (p_business_types IS NULL OR cardinality(p_business_types) = 0 OR e.business_type    = ANY(p_business_types))
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

-- The Mini App calls this with the anon key.
GRANT EXECUTE ON FUNCTION public.search_jobs(
  text, text[], text[], text[], int[], text[], timestamptz, int, int
) TO anon, authenticated;

COMMENT ON FUNCTION public.search_jobs(text, text[], text[], text[], int[], text[], timestamptz, int, int) IS
  'Seeker job search: keyword matching over title/category/employer/location/description with trigram typo tolerance, accent folding and relevance ranking. p_keyword_categories carries the roles the keyword resolved to via the client-side taxonomy.';
