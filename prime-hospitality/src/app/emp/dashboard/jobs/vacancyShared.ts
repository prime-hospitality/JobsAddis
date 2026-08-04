// Shared shape + helpers for job-posting forms across the app: the Employer
// Dashboard's "Manage Job Postings" tab (Post + Vacancy Template sub-tabs)
// and the Admin Dashboard's Content Management > Vacancy Management tab
// (Templates + Posts sub-tabs). Kept schema-compatible with both the
// employer and admin template tables, but those tables remain data-isolated
// from each other -- only this field-entry layer and its validation are
// actually shared.

export interface VacancyFormState {
  id?: string;
  title: string;
  job_category: string;
  description_template: string;
  requirements_template: string;
  location: string;
  employment_type: string;
  salary_type: string;
  salary_min: number | null;
  salary_max: number | null;
  /** Minimum whole years asked for. null = no minimum stated, which reads as
   *  "any" everywhere rather than as zero. Stored on its own `jobs` column,
   *  not inside `requirements`, so the search filter can range-query it. */
  min_years_experience: number | null;
  /** Gender the employer is hiring for. null = "Any", the default, and the only
   *  value that renders as nothing at all rather than as a stated requirement.
   *  Stored on its own `jobs` column for the same reason the year count is. */
  gender_preference: "male" | "female" | null;
  experience_template: string;
  responsibilities_template: string;
  benefits_template: string;
  deadline: string;
  quantity: number;
  education_requirements: string;
}

export function emptyVacancyForm(): VacancyFormState {
  return {
    title: "",
    job_category: "Other",
    description_template: "",
    requirements_template: "",
    location: "",
    employment_type: "Full Time",
    salary_type: "fixed",
    salary_min: null,
    salary_max: null,
    min_years_experience: 0,
    // "Any" — a new job is open to everyone until the employer says otherwise.
    // Defaulting to a gender would put a restriction on the posting that nobody
    // chose, which is the one mistake this field must not make.
    gender_preference: null,
    experience_template: "",
    responsibilities_template: "",
    benefits_template: "",
    deadline: "",
    quantity: 1,
    education_requirements: "",
  };
}

/** Upper bound on a stored year count. Mirrors MAX_YEARS_INPUT in src/lib/vocabulary.ts. */
export const MAX_YEARS_INPUT = 50;

/**
 * Coerces form/DB input to a whole year count, or null when unusable.
 *
 * Duplicated from clampYears() in src/lib/vocabulary.ts rather than imported,
 * because this file is mirrored verbatim into supabase/functions/_shared/vacancy.ts
 * for Deno, which cannot resolve the `@/` alias.
 */
export function coerceYears(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.min(n, MAX_YEARS_INPUT);
}

/**
 * Coerces form/DB input to a storable gender, or null for "Any".
 *
 * Anything unrecognised becomes null rather than raising: a value we cannot
 * read means no restriction was stated, and the widest reading is the safe one
 * — a bad value must never silently narrow who may apply. Mirrored in
 * supabase/functions/_shared/vacancy.ts, and kept in step with
 * normalizeGender() in src/lib/vocabulary.ts.
 */
export function coerceGender(value: unknown): "male" | "female" | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  if (v === "male" || v === "m") return "male";
  if (v === "female" || v === "f") return "female";
  return null;
}

export interface VacancyFormErrors {
  title?: string;
  description_template?: string;
  deadline?: string;
  min_years_experience?: string;
}

/** Single source of truth for job-form validation, shared by the employer
 *  and admin dashboards (both the client-side modal and every server action
 *  that persists a VacancyFormState). */
export function validateVacancyForm(
  form: Pick<VacancyFormState, "title" | "description_template" | "deadline"> &
    Partial<Pick<VacancyFormState, "min_years_experience">>,
  opts?: { requireDeadline?: boolean; maxDeadline?: string | null }
): VacancyFormErrors | null {
  const errors: VacancyFormErrors = {};
  if (!form.title?.trim()) errors.title = "Job Title is required.";
  if (!form.description_template?.trim()) errors.description_template = "Job Description is required.";

  // Blank means "no minimum stated" and is fine; a value that is present but
  // nonsensical is not. Catches typos like 200 before they reach the column.
  const years = form.min_years_experience;
  if (years != null) {
    if (!Number.isFinite(years) || years < 0 || years > MAX_YEARS_INPUT) {
      errors.min_years_experience = `Years of experience must be between 0 and ${MAX_YEARS_INPUT}.`;
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // A deadline is only mandatory on repost, but whenever one IS provided --
  // on any mode -- it can't be in the past and can't be past the employer's
  // plan end date. A blank deadline elsewhere is fine; the server fills in a
  // sensible default.
  if (opts?.requireDeadline && !form.deadline) {
    errors.deadline = "A new deadline is required to repost this job.";
  } else if (form.deadline && new Date(form.deadline) < today) {
    errors.deadline = "Deadline must be today or later.";
  } else if (form.deadline && opts?.maxDeadline && form.deadline > opts.maxDeadline) {
    errors.deadline = `Deadline can't be later than ${opts.maxDeadline} — that's when your current plan ends.`;
  }
  return Object.keys(errors).length ? errors : null;
}

const RESP_MARKER = "\n\nResponsibilities:\n";
const REQ_MARKER = "\n\nRequirements:\n";
const EXP_MARKER = "\n\nExperience:\n";
const BEN_MARKER = "\n\nBenefits:\n";

function formatList(txt: string) {
  return txt
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => (l.trim().match(/^[-•*]/) ? l : `• ${l.trim()}`))
    .join("\n");
}

/** Builds the flat description string stored on the `jobs` row, mirroring the
 *  admin template -> job posting logic exactly, so Post-tab jobs render
 *  identically to admin-posted jobs in the job seeker app. */
export function buildJobDescription(form: Pick<VacancyFormState, "description_template" | "responsibilities_template" | "requirements_template" | "experience_template" | "benefits_template">) {
  let desc = formatList(form.description_template || "");
  if (form.responsibilities_template) desc += RESP_MARKER + formatList(form.responsibilities_template);
  if (form.requirements_template) desc += REQ_MARKER + formatList(form.requirements_template);
  if (form.experience_template) desc += EXP_MARKER + formatList(form.experience_template);
  if (form.benefits_template) desc += BEN_MARKER + formatList(form.benefits_template);
  return desc;
}

/** Reverses buildJobDescription() so an existing job can be reloaded into the
 *  structured form for editing without a schema change to `jobs`. Markers are
 *  peeled off from the end (last-appended first) so an experience section
 *  sitting between Requirements and Benefits doesn't get swallowed by either. */
export function splitJobDescription(full: string) {
  let rest = full || "";
  let benefits_template = "";
  let experience_template = "";
  let requirements_template = "";
  let responsibilities_template = "";

  const benIdx = rest.indexOf(BEN_MARKER);
  if (benIdx !== -1) {
    benefits_template = rest.slice(benIdx + BEN_MARKER.length);
    rest = rest.slice(0, benIdx);
  }
  const expIdx = rest.indexOf(EXP_MARKER);
  if (expIdx !== -1) {
    experience_template = rest.slice(expIdx + EXP_MARKER.length);
    rest = rest.slice(0, expIdx);
  }
  const reqIdx = rest.indexOf(REQ_MARKER);
  if (reqIdx !== -1) {
    requirements_template = rest.slice(reqIdx + REQ_MARKER.length);
    rest = rest.slice(0, reqIdx);
  }
  const respIdx = rest.indexOf(RESP_MARKER);
  if (respIdx !== -1) {
    responsibilities_template = rest.slice(respIdx + RESP_MARKER.length);
    rest = rest.slice(0, respIdx);
  }

  return {
    description_template: rest,
    responsibilities_template,
    requirements_template,
    experience_template,
    benefits_template,
  };
}

/** Resolves the structured salary_type/min/max into the sentinel-encoded
 *  numeric pair stored on `jobs.salary_min` / `jobs.salary_max`
 *  (-1 = negotiable, -2 = per company scale), matching the admin convention. */
export function resolveSalary(form: Pick<VacancyFormState, "salary_type" | "salary_min" | "salary_max">) {
  if (form.salary_type === "negotiable") return { salary_min: -1, salary_max: -1 };
  if (form.salary_type === "company_scale") return { salary_min: -2, salary_max: -2 };
  // Either box alone means one figure, not a range starting at zero. Filling
  // only Maximum used to store min=0/max=25000, which the group announcement
  // read as having no salary at all and posted as "Negotiable / Scale" -- the
  // opposite of what the employer typed. Each side falls back to the other, so
  // one number in either box yields min === max and reads as a single amount
  // everywhere.
  const salary_min = form.salary_min ?? form.salary_max ?? 0;
  const salary_max = form.salary_max ?? form.salary_min ?? 0;
  return { salary_min, salary_max };
}

/** Reverses resolveSalary() for editing. */
export function inferSalaryType(salary_min: number | null | undefined): "fixed" | "negotiable" | "company_scale" {
  if (salary_min === -1) return "negotiable";
  if (salary_min === -2) return "company_scale";
  return "fixed";
}

/** Experience is deliberately absent: it now lives on `jobs.min_years_experience`
 *  as a real integer column. This jsonb keeps only the free-text fields. */
export function buildRequirementsJson(form: Pick<VacancyFormState, "education_requirements">) {
  return {
    education: form.education_requirements || "",
    languages: [] as string[],
    locationPreference: null as string | null,
    workingHours: null as string | null,
  };
}

/** Maps a `jobs` row back into a VacancyFormState for the Edit modal. */
export function jobRowToForm(job: any): VacancyFormState {
  const split = splitJobDescription(job.full_description || job.description || "");
  const requirements = job.requirements || {};
  return {
    id: job.id,
    title: job.title || "",
    job_category: job.category || "Other",
    description_template: split.description_template,
    requirements_template: split.requirements_template,
    location: job.location || "",
    employment_type: job.job_type || "Full Time",
    salary_type: inferSalaryType(job.salary_min),
    salary_min: job.salary_min != null && job.salary_min >= 0 ? job.salary_min : null,
    salary_max: job.salary_max != null && job.salary_max >= 0 ? job.salary_max : null,
    min_years_experience: coerceYears(job.min_years_experience),
    gender_preference: coerceGender(job.gender_preference),
    experience_template: split.experience_template,
    responsibilities_template: split.responsibilities_template,
    benefits_template: split.benefits_template,
    deadline: job.deadline ? String(job.deadline).split("T")[0] : "",
    quantity: job.quantity || 1,
    education_requirements: requirements.education || "",
  };
}

/** Maps an `employer_vacancy_templates` row into a VacancyFormState for the Edit modal. */
export function templateRowToForm(tpl: any): VacancyFormState {
  return {
    id: tpl.id,
    title: tpl.title || "",
    job_category: tpl.job_category || "Other",
    description_template: tpl.description_template || "",
    requirements_template: tpl.requirements_template || "",
    location: tpl.location || "",
    employment_type: tpl.employment_type || "Full Time",
    salary_type: tpl.salary_type || "fixed",
    salary_min: tpl.salary_min,
    salary_max: tpl.salary_max,
    min_years_experience: coerceYears(tpl.min_years_experience),
    gender_preference: coerceGender(tpl.gender_preference),
    experience_template: tpl.experience_template || "",
    responsibilities_template: tpl.responsibilities_template || "",
    benefits_template: tpl.benefits_template || "",
    deadline: tpl.deadline || "",
    quantity: tpl.quantity || 1,
    education_requirements: tpl.education_requirements || "",
  };
}
