-- Job deadlines were losing most of their last day.
--
-- The employer picks a date in an <input type="date">, which hands the server a
-- bare "YYYY-MM-DD". That string went straight into jobs.deadline, a timestamptz,
-- so Postgres resolved it in the database timezone -- UTC -- and it landed on the
-- midnight that *starts* the chosen day. Addis is UTC+3, so a vacancy the
-- employer set to close on Aug 6 actually stopped accepting applications at 3am
-- that morning, before anyone in the country was awake, while the dashboard card
-- and the seeker's job detail screen both went on printing the date as Aug 6.
--
-- resolveDeadline()/resolvePfeDeadline() now store the closing instant
-- (23:59:59+03) for every new write. This backfills the rows already stored the
-- old way.
--
-- Only future deadlines are moved. A job whose deadline has already passed was
-- also cut short, but shifting it forward here would un-expire it: the sweep has
-- already flipped its status and told the employer it ended. Those stay as they
-- are -- this migration corrects what is still running, not history.

UPDATE jobs j
SET deadline = LEAST(
      -- End of the same calendar day, in Addis rather than UTC.
      (((j.deadline AT TIME ZONE 'UTC')::date + time '23:59:59') AT TIME ZONE 'Africa/Addis_Ababa'),
      -- ...but never past the plan it was posted under. The old date-only
      -- comparison in the app enforced that by accident, since midnight-UTC of
      -- the plan's last day always fell before the plan itself expired later
      -- that day. Now that the deadline runs to the end of the day it can
      -- overshoot, so on the final day the job closes with the subscription.
      -- LEAST ignores NULLs, so an employer with no package keeps the first value.
      e.package_expires_at
    )
FROM employers e
WHERE e.id = j.employer_id
  -- Exactly midnight UTC is the fingerprint of a bare date handed to a
  -- timestamptz column. A deadline with any time component was set deliberately
  -- (or by an earlier run of this migration) and is left alone.
  AND (j.deadline AT TIME ZONE 'UTC')::time = time '00:00:00'
  AND j.deadline > now();
