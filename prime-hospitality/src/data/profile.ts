import { ExperienceLevel, JobCategory } from "./jobs";

export interface JobSeekerProfile {
  id: string;
  fullName: string;
  phone: string;
  telegramId: number;
  photoUrl: string | null;
  preferredCategory: JobCategory;
  experienceLevel: ExperienceLevel;
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
 * `experience_levels` is a per-category map, so pass the category of the job being
 * applied to in order to surface the relevant level; it falls back to the first
 * category the seeker selected, then to "Entry Level".
 */
export function mapProfileRowToJobSeekerProfile(
  row: Record<string, unknown>,
  jobCategory?: JobCategory
): JobSeekerProfile {
  const experienceMap = (row.experience_levels || {}) as Record<string, string>;
  const selectedCategories = (row.selected_categories || []) as string[];
  const experienceLevel =
    (jobCategory ? experienceMap[jobCategory] : undefined) ||
    experienceMap[selectedCategories[0]] ||
    "Entry Level";

  return {
    id: row.id as string,
    fullName: row.full_name as string,
    phone: (row.phone_number as string) || "Not Shared",
    telegramId: row.telegram_id as number,
    photoUrl: null,
    preferredCategory: (selectedCategories[0] as JobCategory) || "Waiter",
    experienceLevel: experienceLevel as ExperienceLevel,
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
  experienceLevel: "Mid Level",
  education: "Diploma in Hotel Management",
  languages: ["Amharic", "English"],
  neighborhood: "Megenagna",
  willingToRelocate: false,
  hasProfile: true,
};
