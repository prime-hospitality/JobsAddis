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
