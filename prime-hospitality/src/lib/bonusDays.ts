/** Bonus posting days -- days an admin grants an employer that only begin once
 *  the paid subscription behind them has lapsed.
 *
 *  A bonus term is not a separate plan. It is the same subscription running
 *  longer: `package_expires_at` is pushed forward by the granted days and
 *  nothing else moves, so the package, the tier and the daily post limit the
 *  employer had yesterday are the ones they still have today. See
 *  20260820000000_employer_bonus_days.sql for why the extension lives in that
 *  one column rather than in a second gate everything would have to check.
 *
 *  Shared between the admin's Employer Settings modal and the employer's own
 *  billing page so the two never disagree about how many days are left. */

/** The longest package sold is a year, so a longer bonus is a typo rather than
 *  a grant. Matched by the employers_bonus_days_range CHECK constraint. */
export const MAX_BONUS_DAYS = 365;

const DAY_MS = 24 * 60 * 60 * 1000;

/** What the bonus field keeps of whatever was typed, pasted, dictated or
 *  autofilled into it: the digits, and at most as many as the cap can hold.
 *
 *  Done by rewriting the value rather than by swallowing keystrokes, because a
 *  keydown filter still lets a paste, an Android IME commit or an autofill put
 *  "3o" in the box -- and `<input type="number">` is worse again: it happily
 *  accepts "1e5", "-4" and "2.5", then reports an empty string for them, so the
 *  field would look wrong and read as blank. */
export function sanitizeBonusInput(value: string): string {
  return (value || "").replace(/\D/g, "").slice(0, String(MAX_BONUS_DAYS).length);
}

/** The sanitised field as a number. An empty field is no bonus, not NaN. */
export function parseBonusDays(value: string): number {
  const digits = sanitizeBonusInput(value);
  return digits ? Number(digits) : 0;
}

/** An error message for a bonus the server would refuse anyway, or null.
 *  Only the cap can fail here -- sanitizeBonusInput has already made anything
 *  non-numeric unreachable. */
export function validateBonusDays(value: string): string | null {
  if (parseBonusDays(value) > MAX_BONUS_DAYS) {
    return `A bonus can be at most ${MAX_BONUS_DAYS} days.`;
  }
  return null;
}

/** The bonus columns as they come off an employers row. */
export type BonusRow = {
  bonus_days?: number | null;
  bonus_started_at?: string | Date | null;
  bonus_expires_at?: string | Date | null;
  bonus_days_active?: number | null;
};

export type BonusStatus = {
  /** Granted, not yet started -- waiting for the current term to run out. */
  banked: number;
  /** True while the bonus term is the thing keeping this employer posting. */
  running: boolean;
  /** Length of the running term. 0 when none is running. */
  activeDays: number;
  /** Days of the running term still to come, counting today. 0 when none. */
  daysLeft: number;
  /** When the running term closes. Null when none is running. */
  endsAt: Date | null;
  /** Anything to say at all -- a bank, a running term, or both. */
  hasAny: boolean;
};

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

/** Reads the four bonus columns into the shape both surfaces render.
 *
 *  Days left is rounded up, the same way the "23 days left" beside it on the
 *  billing page and in the admin table is: a term with six hours to run has one
 *  day left, not zero. */
export function readBonusStatus(row: BonusRow | null | undefined, now: Date = new Date()): BonusStatus {
  const banked = Math.max(0, Number(row?.bonus_days) || 0);
  const endsAt = toDate(row?.bonus_expires_at);
  const running = !!endsAt && endsAt.getTime() > now.getTime();

  return {
    banked,
    running,
    activeDays: running ? Math.max(0, Number(row?.bonus_days_active) || 0) : 0,
    daysLeft: running ? Math.max(0, Math.ceil((endsAt!.getTime() - now.getTime()) / DAY_MS)) : 0,
    endsAt: running ? endsAt : null,
    hasAny: banked > 0 || running,
  };
}

/** Unspent days of a running term, for banking back when the term it extends is
 *  about to be rewritten -- a renewal, or a corrected registration date.
 *
 *  Rounded up on purpose. The employer was given these days; a renewal arriving
 *  half way through one is not a decision to take that day away, and the half
 *  day in dispute costs nothing next to explaining to a business why the ten
 *  bonus days they were promised became nine. */
export function unspentBonusDays(row: BonusRow | null | undefined, now: Date = new Date()): number {
  return readBonusStatus(row, now).daysLeft;
}

export function formatBonusDays(days: number): string {
  return `${days} bonus day${days === 1 ? "" : "s"}`;
}
