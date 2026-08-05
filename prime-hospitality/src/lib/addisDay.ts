/** When "today" starts, for every daily allowance in the employer dashboard.
 *
 *  Both the daily posting limit and the Telegram group boost quota reset once a
 *  day, and an employer in Addis reads that as "at midnight". Neither
 *  `new Date().setHours(0,0,0,0)` nor a UTC day gives them that:
 *
 *    - on the server it runs in the deployment's timezone, which on Vercel is
 *      UTC, so the budget rolled over at 3am local;
 *    - in the browser it runs in whatever timezone the device is set to, so
 *      the dashboard's own "posted today" count could disagree with the server
 *      that enforces the limit.
 *
 *  Pinning both sides to Addis removes the disagreement and puts the rollover
 *  where the people using it expect it. Ethiopia is UTC+3 year round and has
 *  never observed daylight saving, so a fixed offset is exact rather than an
 *  approximation -- which is why this is arithmetic and not Intl timezone
 *  formatting.
 */
const ADDIS_UTC_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** The most recent midnight in Addis Ababa, as an absolute instant. */
export function startOfAddisDay(now: number = Date.now()): Date {
  const addisLocal = now + ADDIS_UTC_OFFSET_MS;
  const midnightAddisLocal = Math.floor(addisLocal / DAY_MS) * DAY_MS;
  return new Date(midnightAddisLocal - ADDIS_UTC_OFFSET_MS);
}

/** The closing instant for a date-only deadline, for the same reasons.
 *
 *  An employer picking "2026-08-06" in an <input type="date"> means
 *  "applications close at the end of Aug 6". But that bare YYYY-MM-DD string
 *  goes into a timestamptz column, where Postgres resolves it in the database's
 *  timezone -- UTC on Supabase -- landing on the midnight that *starts* Aug 6,
 *  which is 3am in Addis. The vacancy then closes before anyone in the country
 *  is awake, while both the employer's card and the seeker's job detail screen
 *  keep printing the date as Aug 6: a seeker who opens it during business hours
 *  is told the deadline is today next to an apply button that refuses them.
 *
 *  Anything already carrying a time component is passed through untouched, so
 *  this is safe to wrap around a value that may or may not be date-only.
 */
export function endOfAddisDay(dateOnly: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return dateOnly;
  return `${dateOnly}T23:59:59+03:00`;
}
