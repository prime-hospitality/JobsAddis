import type { Lang, TKey } from "@/lib/i18n";
import { LOCATIONS, SUB_CITIES } from "@/data/locations";
import { HOTEL_JOB_CATEGORIES, roleByName } from "@/data/job-categories";

/**
 * Controlled vocabularies whose values are persisted to Supabase or sent as
 * query filters. The values stay English so stored data and queries keep
 * working; only the display labels are translated, via the maps below.
 */

/**
 * The experience scale the search filter queries against.
 *
 * These are exactly the values the employer post form writes to
 * `jobs.requirements->>'experience'` (see VacancyFormModal's Experience
 * select). They have to match character-for-character — the filter is a
 * straight `in()` against that column, so a seeker-only wording like
 * "Junior Level(1-3 years)" would match nothing.
 *
 * Distinct from PROFILE_EXPERIENCE_OPTIONS below: that one describes how much
 * experience the *seeker* has, this one describes what the *job* asks for.
 */
export const JOB_EXPERIENCE_OPTIONS = [
  "Entry level",
  "Junior",
  "Intermediate",
  "Senior",
  "Expert",
];

export const JOB_EXPERIENCE_LABELS: Record<string, TKey> = {
  "Entry level": "search.experience.entry",
  "Junior": "search.experience.junior",
  "Intermediate": "search.experience.intermediate",
  "Senior": "search.experience.senior",
  "Expert": "search.experience.expert",
};

/**
 * The seeker's self-reported level per role, stored in
 * `profiles.experience_levels`. Only the profile role editor writes these.
 */
export const PROFILE_EXPERIENCE_OPTIONS = [
  "Entry Level (Fresh Graduate)",
  "Junior Level(1-3 years)",
  "Mid Level(3-5 years)",
  "Senior(5-8 years)",
  "Executive(VP, Director)",
  "Senior Executive(C Level)",
];

export const PROFILE_EXPERIENCE_LABELS: Record<string, TKey> = {
  "Entry Level (Fresh Graduate)": "profile.experience.entry",
  "Junior Level(1-3 years)": "profile.experience.junior",
  "Mid Level(3-5 years)": "profile.experience.mid",
  "Senior(5-8 years)": "profile.experience.senior",
  "Executive(VP, Director)": "profile.experience.executive",
  "Senior Executive(C Level)": "profile.experience.seniorExecutive",
};

/** Onboarding uses a shorter, plainer scale than the search filter. */
export const ONBOARDING_EXPERIENCE_OPTIONS = [
  "No Experience",
  "Less than 1 year",
  "1 to 2 years",
  "3 to 5 years",
  "5+ years",
];

export const ONBOARDING_EXPERIENCE_LABELS: Record<string, TKey> = {
  "No Experience": "onboarding.experience.none",
  "Less than 1 year": "onboarding.experience.lessThanOne",
  "1 to 2 years": "onboarding.experience.oneToTwo",
  "3 to 5 years": "onboarding.experience.threeToFive",
  "5+ years": "onboarding.experience.fivePlus",
};

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
