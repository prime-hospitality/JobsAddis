import { startOfAddisDay } from "@/lib/addisDay";

/** An employer's subscription window: when it opened, when it closes, and how
 *  much of it is left today.
 *
 *  An admin usually registers a business days -- sometimes weeks -- after it
 *  paid and started, so the window is anchored to the registration date the
 *  admin types in, not to the day the record happens to reach the dashboard. A
 *  30-day package entered a week late is worth 23 more days, not a fresh 30.
 *
 *  The Add Employer preview, the confirmation modal and the server action that
 *  writes package_expires_at all compute through here: the number the admin
 *  confirms has to be the number that gets stored, and a second implementation
 *  would eventually disagree with the first.
 *
 *  Days are Addis calendar days, for the same reason job deadlines are (see
 *  addisDay.ts): a raw millisecond division changes its answer as the clock
 *  moves through the day, and it answers differently on a laptop set to another
 *  timezone than on a server running in UTC. "23 days left" has to be 23 all
 *  day, on both sides. */

const DAY_MS = 24 * 60 * 60 * 1000;

/** How far ahead a subscription may be scheduled to start. Anything beyond
 *  this is a mistyped year, not a plan. */
export const MAX_FUTURE_START_DAYS = 365;

export type SubscriptionWindowState =
  /** Paid ahead: the term hasn't opened yet, so all of it is still to come. */
  | "future"
  /** Open today, with days left on it. */
  | "active"
  /** The whole term fell before today -- registering this would store an
   *  already-lapsed subscription. */
  | "exhausted";

export type SubscriptionWindow = {
  /** Midnight in Addis on the registration date, as an absolute instant. */
  startsAt: Date;
  expiresAt: Date;
  /** Whole days of the term already spent. 0 when it starts today or later. */
  elapsedDays: number;
  /** Whole days until the term opens. 0 once it has. */
  startsInDays: number;
  /** Days of the term still to come, counting today. */
  daysLeft: number;
  state: SubscriptionWindowState;
};

/** "YYYY-MM-DD" (what `<input type="date">` produces) -> midnight in Addis on
 *  that day. Returns null for anything else, including the shapes
 *  `new Date(...)` would cheerfully accept by rolling them forward. */
export function parseCalendarDate(value: string | null | undefined): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((value || "").trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  // Built in UTC first only so the impossible days the Date constructor rolls
  // over (Feb 30 -> Mar 2) can be caught before they anchor a window two days
  // late; startOfAddisDay then snaps it to the Addis midnight of that date.
  const utc = new Date(Date.UTC(year, month - 1, day, 12));
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    return null;
  }
  return startOfAddisDay(utc.getTime());
}

const ADDIS_DATE_PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: "Africa/Addis_Ababa",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** The Addis calendar date of an instant, as "YYYY-MM-DD" -- what a date input
 *  needs to show a stored subscription_started_at back to an admin. Pinned to
 *  Addis rather than the device so a laptop set to another timezone doesn't
 *  render the stored midnight as the day before. Empty string for anything
 *  unparseable. */
export function toCalendarDate(when: Date | string | null | undefined): string {
  const date = when instanceof Date ? when : new Date(when || "");
  if (!Number.isFinite(date.getTime())) return "";
  const parts = ADDIS_DATE_PARTS.formatToParts(date);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/** Today in Addis as "YYYY-MM-DD" -- the value the date input opens on. */
export function todayCalendarDate(now: Date = new Date()): string {
  return toCalendarDate(now);
}

/** The window a package of `durationDays` would produce if it started on
 *  `startDate`. Null when the date is unparseable or the duration is not a
 *  positive number of days -- callers treat that as "nothing to preview yet". */
export function computeSubscriptionWindow(
  startDate: string | null | undefined,
  durationDays: number | null | undefined,
  now: Date = new Date()
): SubscriptionWindow | null {
  const startsAt = parseCalendarDate(startDate);
  if (!startsAt) return null;
  if (typeof durationDays !== "number" || !Number.isFinite(durationDays) || durationDays <= 0) return null;

  const today = startOfAddisDay(now.getTime()).getTime();
  // Positive when the start is behind us, negative when it's still ahead.
  const offsetDays = Math.round((today - startsAt.getTime()) / DAY_MS);
  const elapsedDays = Math.max(0, offsetDays);
  const startsInDays = Math.max(0, -offsetDays);
  const daysLeft = durationDays - elapsedDays;

  return {
    startsAt,
    expiresAt: new Date(startsAt.getTime() + durationDays * DAY_MS),
    elapsedDays,
    startsInDays,
    daysLeft,
    state: startsInDays > 0 ? "future" : daysLeft > 0 ? "active" : "exhausted",
  };
}

/** Returns an error message, or null when an employer can actually be
 *  registered on this date. Shared so the form refuses exactly the cases the
 *  server would have rejected anyway. */
export function validateSubscriptionStart(
  startDate: string | null | undefined,
  durationDays: number | null | undefined,
  packageName?: string | null,
  now: Date = new Date()
): string | null {
  const window = computeSubscriptionWindow(startDate, durationDays, now);
  if (!window) return "Enter a valid registration date.";

  if (window.startsInDays > MAX_FUTURE_START_DAYS) {
    return "That registration date is more than a year away — check the year before registering.";
  }

  if (window.state === "exhausted") {
    const named = packageName ? `the ${packageName} package` : "this package";
    return (
      `That registration date is ${window.elapsedDays} days ago, but ${named} only runs ` +
      `${durationDays} days — the subscription would already be over. ` +
      `Pick a later date, or a longer package.`
    );
  }

  return null;
}

/** Formats a window date for display, pinned to Addis because that is the
 *  anchor the day counts were measured against -- letting the browser shift it
 *  would print a date one day off from the "23 days left" sitting next to it. */
export function formatWindowDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    timeZone: "Africa/Addis_Ababa",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** The one-line read-out the preview box and the confirmation modal both show,
 *  so the admin confirms the same sentence they were just looking at. */
export function describeSubscriptionWindow(window: SubscriptionWindow): string {
  const days = (n: number) => `${n} day${n === 1 ? "" : "s"}`;

  if (window.state === "future") {
    return `Starts in ${days(window.startsInDays)}, then runs ${days(window.daysLeft)}.`;
  }
  if (window.state === "exhausted") {
    return `Already over — ${days(window.elapsedDays)} have passed.`;
  }
  return window.elapsedDays === 0
    ? `Starts today — ${days(window.daysLeft)} left.`
    : `${days(window.elapsedDays)} already used, ${days(window.daysLeft)} left.`;
}
