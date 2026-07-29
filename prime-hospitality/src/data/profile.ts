import { JobCategory } from "./jobs";

export interface JobSeekerProfile {
  id: string;
  fullName: string;
  phone: string;
  telegramId: number;
  photoUrl: string | null;
  preferredCategory: JobCategory;
  /** Whole years in `preferredCategory`. null = not stated by this seeker. */
  experienceYears: number | null;
  /** Kind of establishment those years were earned at, if given. */
  experienceContext: string | null;
  education: string;
  languages: string[];
  neighborhood: string;
  willingToRelocate: boolean;
  hasProfile: boolean;
}

/**
 * Map a raw `profiles` row (as returned by the `get_profile` edge action) into the
 * shape the application screens expect.
 *
 * `experience_years` is a per-category map, so pass the category of the job being
 * applied to in order to surface the relevant count; it falls back to the first
 * category the seeker selected, then to null.
 *
 * null rather than a zero/"Entry Level" default: a seeker who has not filled in
 * that role has not told us they are a beginner, and the apply screen renders
 * the difference honestly as "not specified".
 */
export function mapProfileRowToJobSeekerProfile(
  row: Record<string, unknown>,
  jobCategory?: JobCategory
): JobSeekerProfile {
  const yearsMap = (row.experience_years || {}) as Record<string, number>;
  const contextMap = (row.experience_context || {}) as Record<string, string>;
  const selectedCategories = (row.selected_categories || []) as string[];
  const lookupCategory =
    jobCategory && yearsMap[jobCategory] != null ? jobCategory : selectedCategories[0];
  const experienceYears = lookupCategory != null ? yearsMap[lookupCategory] ?? null : null;
  const experienceContext = lookupCategory != null ? contextMap[lookupCategory] ?? null : null;

  return {
    id: row.id as string,
    fullName: row.full_name as string,
    phone: (row.phone_number as string) || "Not Shared",
    telegramId: row.telegram_id as number,
    photoUrl: null,
    preferredCategory: (selectedCategories[0] as JobCategory) || "Waiter",
    experienceYears,
    experienceContext,
    education: "",
    languages: [],
    neighborhood: row.location as string,
    willingToRelocate: row.willing_to_relocate as boolean,
    hasProfile: true,
  };
}

// Mock profile — represents the demo job seeker
export const MOCK_PROFILE: JobSeekerProfile = {
  id: "profile-001",
  fullName: "Biruk Tadesse",
  phone: "+251 91 234 5678",
  telegramId: 123456789,
  photoUrl: null,
  preferredCategory: "Waiter",
  experienceYears: 4,
  experienceContext: "Hotel",
  education: "Diploma in Hotel Management",
  languages: ["Amharic", "English"],
  neighborhood: "Megenagna",
  willingToRelocate: false,
  hasProfile: true,
};
