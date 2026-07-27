import type { Lang, TKey } from "@/lib/i18n";
import { LOCATIONS, SUB_CITIES } from "@/data/locations";

/**
 * Controlled vocabularies whose values are persisted to Supabase or sent as
 * query filters. The values stay English so stored data and queries keep
 * working; only the display labels are translated, via the maps below.
 */

/** Used by the search filter and the profile role editor. */
export const SEARCH_EXPERIENCE_OPTIONS = [
  "Entry Level (Fresh Graduate)",
  "Junior Level(1-3 years)",
  "Mid Level(3-5 years)",
  "Senior(5-8 years)",
  "Executive(VP, Director)",
  "Senior Executive(C Level)",
];

export const SEARCH_EXPERIENCE_LABELS: Record<string, TKey> = {
  "Entry Level (Fresh Graduate)": "search.experience.entry",
  "Junior Level(1-3 years)": "search.experience.junior",
  "Mid Level(3-5 years)": "search.experience.mid",
  "Senior(5-8 years)": "search.experience.senior",
  "Executive(VP, Director)": "search.experience.executive",
  "Senior Executive(C Level)": "search.experience.seniorExecutive",
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
 * Amharic display names for the 43 job categories.
 *
 * The English name stays the stored/queried value everywhere — this is a
 * render-time lookup only, so existing profiles, job rows and search filters are
 * untouched. Seekers can also type a custom role via "Other", which won't be in
 * this map; `categoryLabel` falls back to showing it exactly as entered.
 *
 * Kept deliberately short: these render as chips in a two-column grid, so the
 * slash-variants in `job-categories.ts` (e.g. "ቤልቦይ / ፖርተር") are trimmed to one term.
 */
const CATEGORY_AM: Record<string, string> = {
  "Accountant": "ሂሳብ ሹም",
  "Banquet": "ባንኬት",
  "Barista": "ባሪስታ",
  "Bellboy": "ቤልቦይ",
  "Cashier": "ካሺየር",
  "Chef": "ሼፍ",
  "Chief Engineer": "ዋና መሐንዲስ",
  "Cook": "አብሳይ",
  "Cost Control": "ወጪ ተቆጣጣሪ",
  "Delivery": "ዴሊቨሪ",
  "Driver": "ሹፌር",
  "Executive Chef": "ዋና ሼፍ",
  "F&B": "ምግብና መጠጥ",
  "Finance": "ፋይናንስ",
  "General Manager": "ዋና ሥራ አስኪያጅ",
  "Guest Relations Officer": "የእንግዳ ግንኙነት ኦፊሰር",
  "Gym Trainer": "የጂም አሰልጣኝ",
  "HR Manager": "የሰው ኃይል ሥራ አስኪያጅ",
  "HR Officer": "የሰው ኃይል ኦፊሰር",
  "Housekeeper": "የክፍል አጽዳጅ",
  "IT Officer": "አይቲ ኦፊሰር",
  "Kitchen Assistant": "የኩሽና ረዳት",
  "Lifeguard": "ላይፍጋርድ",
  "Maintenance": "ጥገና",
  "Manager": "ሥራ አስኪያጅ",
  "Marketing & Sales": "ሽያጭና ማርኬቲንግ",
  "Night Auditor": "የሌሊት ኦዲተር",
  "Other": "ሌላ",
  "Painter": "ቀለም ቀቢ",
  "Payroll Officer": "የደመወዝ ኦፊሰር",
  "Phone Operator": "የስልክ ኦፕሬተር",
  "Reception": "አቀባበል",
  "Receptionist": "እንግዳ ተቀባይ",
  "Recruiter": "የቅጥር ኦፊሰር",
  "Reservations Agent": "የክፍል ማስያዣ ወኪል",
  "Security": "ጥበቃ",
  "Sous Chef": "ምክትል ሼፍ",
  "Spa Attendant": "የስፓ ባለሙያ",
  "Steward": "እቃ አጣቢ",
  "Store Keeper": "መጋዘን ጠባቂ",
  "Traditional Cook": "የባህል ምግብ አብሳይ",
  "Training & Development Officer": "የሥልጠናና ልማት ኦፊሰር",
  "Waiter": "አስተናጋጅ",
};

/** Display label for a job category. Unknown values (custom "Other" roles) pass through. */
export function categoryLabel(name: string, lang: Lang): string {
  if (lang === "en") return name;
  return CATEGORY_AM[name] ?? name;
}

/**
 * True if a category matches a search term in either language, so an Amharic
 * user typing "አስተናጋጅ" finds Waiter and an English term still works.
 */
export function categoryMatches(name: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return name.toLowerCase().includes(q) || (CATEGORY_AM[name] ?? "").includes(q);
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

/** Display names for the category-picker groupings. Never persisted. */
export const TEAM_LABELS: Record<string, TKey> = {
  "Front Office": "search.teams.frontOffice",
  "Housekeeping": "search.teams.housekeeping",
  "Food & Beverage": "search.teams.foodAndBeverage",
  "Marketing": "search.teams.marketing",
  "Human Resources": "search.teams.humanResources",
  "Engineering & Maintenance": "search.teams.engineeringMaintenance",
  "Finance & Accounting": "search.teams.financeAccounting",
};
