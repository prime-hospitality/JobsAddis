-- Which roles actually have openings right now, for the empty search state.
--
-- A search that finds nothing currently ends at "Try a different keyword",
-- which leaves the seeker guessing at a vocabulary they cannot see. Being able
-- to say "these roles are hiring" turns the dead end into a next step.
--
-- An RPC with a GROUP BY rather than selecting every active row and tallying
-- client-side: the counts are what the screen needs, and shipping one row per
-- job to a phone to compute them would get worse exactly as the board fills up.
CREATE OR REPLACE FUNCTION public.active_job_categories()
RETURNS TABLE (category text, job_count bigint)
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT j.category, count(*) AS job_count
  FROM public.jobs j
  WHERE j.status = 'active'
    AND j.category IS NOT NULL
    AND btrim(j.category) <> ''
  GROUP BY j.category
  ORDER BY count(*) DESC, j.category ASC;
$$;

GRANT EXECUTE ON FUNCTION public.active_job_categories() TO anon, authenticated;

COMMENT ON FUNCTION public.active_job_categories() IS
  'Role names with at least one active job, most openings first. Feeds the "roles hiring now" suggestions on an empty search.';
