import type { Lang, TKey, Translate } from "@/lib/i18n";
import { LOCATIONS, SUB_CITIES } from "@/data/locations";
import { HOTEL_JOB_CATEGORIES, roleByName } from "@/data/job-categories";

/**
 * Controlled vocabularies whose values are persisted to Supabase or sent as
 * query filters. The values stay English so stored data and queries keep
 * working; only the display labels are translated, via the maps below.
 */

/**
 * Experience is a count of years, never a seniority label.
 *
 * Hospitality titles are relative to the property that awarded them: two years
 * at a large hotel is that hotel's "junior", and those same two years are a
 * manager-grade hire at a small restaurant. A label therefore stops meaning
 * anything the moment it leaves the employer who wrote it, while a year count
 * travels intact. So we store the fact and let each employer apply their own
 * judgement to it.
 *
 * Seeker side: `profiles.experience_years` maps role -> years, with
 * `profiles.experience_context` mapping role -> the kind of establishment those
 * years were earned at, because a year at a hotel and a year at a kiosk are
 * different facts. Job side: `jobs.min_years_experience` is the minimum asked
 * for. Both are plain integers, so every comparison in the app is numeric.
 */

/** Top of the seeker picker; stored as-is and rendered open-ended ("10+"). */
export const MAX_YEARS = 10;

/** Upper bound accepted from the employer form, to reject typos like 200. */
export const MAX_YEARS_INPUT = 50;

/** The chip row a seeker taps, one per selected role. */
export const YEARS_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, MAX_YEARS];

/**
 * Renders a year count. The single place a number turns into words — keep it
 * that way, so "10+" and the singular/plural split can never disagree between
 * two screens the way the old label lists did.
 */
export function yearsLabel(years: number | null | undefined, t: Translate): string {
  if (years == null) return t("experience.notSpecified");
  if (years <= 0) return t("experience.none");
  if (years >= MAX_YEARS) return t("experience.yearsPlus", { years: MAX_YEARS });
  if (years === 1) return t("experience.year", { years });
  return t("experience.years", { years });
}

/** What a job asks for, e.g. "3+ years". */
export function minYearsLabel(years: number | null | undefined, t: Translate): string {
  if (years == null) return t("experience.anyExperience");
  if (years <= 0) return t("experience.none");
  return t("experience.yearsPlus", { years });
}

/**
 * Search filter buckets over `jobs.min_years_experience`. `max` is inclusive;
 * the open-ended band uses MAX_YEARS_INPUT rather than Infinity so it can go
 * straight into a PostgREST range filter.
 */
export interface ExperienceBand {
  id: string;
  min: number;
  max: number;
  labelKey: TKey;
}

export const EXPERIENCE_BANDS: ExperienceBand[] = [
  { id: "0", min: 0, max: 0, labelKey: "search.experience.none" },
  { id: "1-2", min: 1, max: 2, labelKey: "search.experience.oneToTwo" },
  { id: "3-5", min: 3, max: 5, labelKey: "search.experience.threeToFive" },
  { id: "6+", min: 6, max: MAX_YEARS_INPUT, labelKey: "search.experience.sixPlus" },
];

export function bandById(id: string): ExperienceBand | undefined {
  return EXPERIENCE_BANDS.find((b) => b.id === id);
}

/**
 * Whether a seeker's years clear a job's minimum.
 *
 * Unknown on either side is deliberately *not* a failure: a seeker who has not
 * filled in that role yet, or a job that never stated a minimum, must read as
 * neutral. Treating unknown as zero would open a fresh profile onto a wall of
 * "requirements not met" warnings.
 *
 * The result is advisory only — nothing in the app blocks an application on it,
 * which is the point: the whole reason for counting years is that one property's
 * yardstick should not decide who may apply somewhere else.
 */
export function meetsExperience(
  seekerYears: number | null | undefined,
  jobMinYears: number | null | undefined
): boolean {
  if (seekerYears == null || jobMinYears == null) return true;
  return seekerYears >= jobMinYears;
}

/**
 * Gender the employer is hiring for. null = they never restricted the role.
 *
 * "Open to anyone" is the absence of a requirement, not a requirement, so it is
 * null rather than a third "any" value — which is what lets every renderer show
 * nothing at all for it instead of a row reading "Any".
 */
export type GenderPreference = "male" | "female";

/**
 * Normalises a stored gender to the two values we can actually compare, or null.
 *
 * Tolerant on the way in because the seeker side is free text: onboarding
 * writes "male"/"female", but older rows and the IDP import carry "M"/"F" and
 * mixed casing. Anything else — blank, a typo, a value from some future
 * onboarding — is null, which reads as unknown and suppresses the advisory.
 */
export function normalizeGender(value: unknown): GenderPreference | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  if (v === "male" || v === "m") return "male";
  if (v === "female" || v === "f") return "female";
  return null;
}

/**
 * Whether a seeker matches a job's stated gender.
 *
 * Unknown on either side is not a failure, exactly as in meetsExperience(): a
 * job that never restricted the role, and a seeker whose gender we do not hold,
 * must both read as neutral. Telling someone they fall short of a requirement
 * that was never stated would be a claim we cannot support.
 *
 * Advisory only. Nothing blocks an application on it, nothing hides the job,
 * and the search RPC has no gender predicate — the employer's requirement is
 * shown to the seeker, and the seeker decides.
 */
export function meetsGender(
  seekerGender: string | null | undefined,
  jobGender: string | null | undefined
): boolean {
  const wanted = normalizeGender(jobGender);
  if (wanted == null) return true;
  const seeker = normalizeGender(seekerGender);
  if (seeker == null) return true;
  return seeker === wanted;
}

/** "Female only" — what a job's requirement is called on screen. Never called
 *  with null: an unrestricted job prints no gender line at all. */
export function genderPreferenceLabel(gender: GenderPreference, t: Translate): string {
  return t(gender === "female" ? "gender.femaleOnly" : "gender.maleOnly");
}

/** The bare word, for sentences that name a gender rather than label a rule. */
export function genderLabel(gender: GenderPreference, t: Translate): string {
  return t(gender === "female" ? "gender.female" : "gender.male");
}

/** Coerces form/API input to a stored year count, or null when unusable. */
export function clampYears(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.min(n, MAX_YEARS_INPUT);
}

/**
 * Conservative floor mapping from the four legacy label scales to years.
 *
 * Every label maps to the *lowest* year count it could have meant, so the
 * migration can never exclude someone from a job they actually qualify for.
 * Deliberately lossy: "Senior" never had a year value, and pretending otherwise
 * would invent precision the old data never carried.
 *
 * Keys are lowercased and whitespace-collapsed because the old writers
 * disagreed on casing ("Entry level" from the option list vs "Entry Level" from
 * buildRequirementsJson's default).
 */
const LEGACY_EXPERIENCE_YEARS: Record<string, number> = {
  "entry level": 0,
  "entry level (fresh graduate)": 0,
  "no experience": 0,
  "less than 1 year": 0,
  "junior": 1,
  "junior level(1-3 years)": 1,
  "1 to 2 years": 1,
  "intermediate": 3,
  "mid level": 3,
  "mid level(3-5 years)": 3,
  "3 to 5 years": 3,
  "senior": 5,
  "senior level": 5,
  "senior(5-8 years)": 5,
  "5+ years": 5,
  "expert": 8,
  "executive(vp, director)": 8,
  "senior executive(c level)": 10,
};

/**
 * Legacy label -> years, or null when unrecognised.
 *
 * Null rather than 0 on purpose: an unparseable string means we do not know,
 * and asserting "no experience" about someone we failed to parse is worse than
 * admitting the gap. Callers render null as "not specified".
 */
export function legacyExperienceToYears(label: string | null | undefined): number | null {
  if (!label) return null;
  const key = label.trim().toLowerCase().replace(/\s+/g, " ");
  return LEGACY_EXPERIENCE_YEARS[key] ?? null;
}

export const DATE_OPTIONS = [
  "Any date",
  "Since yesterday",
  "Last 7 days",
  "Last 30 days",
];

export const DATE_LABELS: Record<string, TKey> = {
  "Any date": "search.date.any",
  "Since yesterday": "search.date.sinceYesterday",
  "Last 7 days": "search.date.last7",
  "Last 30 days": "search.date.last30",
};

/**
 * Job-role display. The Amharic names live on the role records in
 * `job-categories.ts` — this used to be a second hand-maintained copy of them,
 * which is exactly how the two lists drifted apart.
 *
 * The English name stays the stored/queried value everywhere; these are
 * render-time lookups only. Seekers can also type a custom role via "Other",
 * which has no record — both helpers fall back to the raw string.
 */

/** Display label for a job role. Unknown values (custom roles) pass through. */
export function categoryLabel(name: string, lang: Lang): string {
  if (lang === "en") return name;
  return roleByName(name)?.nameAm ?? name;
}

/**
 * True if a role matches a search term in either language, so an Amharic user
 * typing "አስተናጋጅ" finds Waiter and an English term still works. The longer
 * descriptive name and the title keywords are matched too, so "front desk"
 * finds Receptionist.
 */
export function categoryMatches(name: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (name.toLowerCase().includes(q)) return true;

  const role = roleByName(name);
  if (!role) return false;
  return (
    role.nameAm.includes(q) ||
    (role.fullName?.toLowerCase().includes(q) ?? false) ||
    role.keywords.some((kw) => kw.includes(q))
  );
}

/** Roles whose department matches, used by the picker's department drill-down. */
export function rolesInDepartment(department: string): string[] {
  return HOTEL_JOB_CATEGORIES.filter((c) => c.department === department).map((c) => c.name);
}

/**
 * Employer business types. The list itself is data — it lives in the
 * `business_types` table so admins and employers can add their own via "Other"
 * — so this map only covers the three seeded types. Anything custom falls
 * through and renders exactly as it was typed.
 */
const BUSINESS_TYPE_AM: Record<string, string> = {
  Hotel: "ሆቴል",
  Restaurant: "ሬስቶራንት",
  Cafe: "ካፌ",
};

export function businessTypeLabel(name: string, lang: Lang): string {
  if (lang === "en") return name;
  return BUSINESS_TYPE_AM[name] ?? name;
}

/** Matches a business type on its English or Amharic name. */
export function businessTypeMatches(name: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return name.toLowerCase().includes(q) || (BUSINESS_TYPE_AM[name] ?? "").includes(q);
}

/**
 * Location display. `locations.ts` already carries `nameAm` for every sub-city
 * and every neighbourhood — these helpers are what finally render it. As with
 * categories, the English name stays the stored value.
 */
export function locationLabel(name: string, lang: Lang): string {
  if (lang === "en") return name;
  return LOCATION_AM.get(name) ?? name;
}

export function subCityLabel(name: string, lang: Lang): string {
  if (lang === "en") return name;
  return SUB_CITY_AM.get(name) ?? name;
}

/** Matches a location on its English name, Amharic name, or sub-city in either language. */
export function locationMatches(loc: { name: string; nameAm?: string; subCity: string }, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    loc.name.toLowerCase().includes(q) ||
    (loc.nameAm ?? "").includes(q) ||
    loc.subCity.toLowerCase().includes(q) ||
    (SUB_CITY_AM.get(loc.subCity) ?? "").includes(q)
  );
}

const LOCATION_AM = new Map(
  LOCATIONS.filter((l) => l.nameAm).map((l) => [l.name, l.nameAm as string])
);

const SUB_CITY_AM = new Map(SUB_CITIES.map((s) => [s.name as string, s.nameAm]));

/**
 * Display names for the departments the role picker drills into. Never
 * persisted — the stored value is always the role, and the department is
 * derived from it, so these are safe to reword.
 */
export const DEPARTMENT_LABELS: Record<string, TKey> = {
  "Food & Beverage Service": "search.teams.foodAndBeverage",
  "Kitchen & Culinary": "search.teams.kitchen",
  "Front Office": "search.teams.frontOffice",
  "Housekeeping & Laundry": "search.teams.housekeeping",
  "Finance & Accounting": "search.teams.financeAccounting",
  "Management & Administration": "search.teams.management",
  "Sales & Marketing": "search.teams.marketing",
  "Human Resources": "search.teams.humanResources",
  "Engineering": "search.teams.engineering",
  "IT": "search.teams.it",
  "Security": "search.teams.security",
  "Spa & Recreation": "search.teams.spa",
  "Other": "search.teams.other",
};
