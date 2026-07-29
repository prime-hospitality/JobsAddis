// -----------------------------------------------------------------------------
// Shared job-posting rules for the Telegram Mini App employer surface.
//
// An employer can now post from two places: the web dashboard (Next.js server
// actions in src/app/emp/dashboard/jobs/) and the Mini App dashboard (the
// employer actions in validate-telegram-auth). Those run in different runtimes
// -- Node and Deno -- so they cannot import the same file, but a job posted
// from a phone must be identical in every way to one posted from a desktop:
// same description composition, same salary encoding, same deadline defaulting,
// same daily limit, same auto_publish routing.
//
// This file is the Deno-side mirror of two Node files. Change one, change all:
//   - src/app/emp/dashboard/jobs/vacancyShared.ts  (form shape, validation,
//     description/salary/requirements encoding)
//   - src/app/emp/dashboard/jobs/actions.ts        (publishing rules:
//     getEmployerPublishingRules / resolveDeadline / getTodayPostCount)
//
// Nothing here talks to Telegram or reads a request -- it is pure rules plus
// the Supabase queries those rules need, so the edge function handlers stay
// readable and the rules stay testable in one place.
// -----------------------------------------------------------------------------

/** The structured form both dashboards edit. Mirrors VacancyFormState in
 *  vacancyShared.ts. `id` is only present when editing an existing row. */
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
   *  "any" everywhere rather than as zero. Stored on `jobs.min_years_experience`,
   *  not inside `requirements`, so the search filter can range-query it. */
  min_years_experience: number | null;
  experience_template: string;
  responsibilities_template: string;
  benefits_template: string;
  deadline: string;
  quantity: number;
  education_requirements: string;
}

/** Strips HTML tags from free text. Same rule the rest of this function
 *  applies to every user-authored string before it reaches the database. */
function stripTags(text: unknown): string {
  if (typeof text !== "string") return "";
  return text.replace(/<[^>]*>?/gm, "");
}

/** Upper bound on a stored year count. Mirrors MAX_YEARS_INPUT in vacancyShared.ts. */
export const MAX_YEARS_INPUT = 50;

/** Coerces untrusted input to a whole year count, or null when unusable.
 *  Mirrors coerceYears() in vacancyShared.ts. */
export function coerceYears(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.min(n, MAX_YEARS_INPUT);
}

/** Coerces an untrusted JSON payload into a VacancyFormState, sanitizing every
 *  free-text field. The Mini App posts this straight off the wire, so nothing
 *  below may assume the client sent well-formed values. */
export function coerceVacancyForm(raw: Record<string, unknown> | null | undefined): VacancyFormState {
  const r = raw ?? {};
  const num = (v: unknown): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : null;
  };
  return {
    title: stripTags(r.title).trim(),
    job_category: stripTags(r.job_category).trim() || "Other",
    description_template: stripTags(r.description_template).trim(),
    requirements_template: stripTags(r.requirements_template),
    location: stripTags(r.location).trim(),
    employment_type: stripTags(r.employment_type).trim() || "Full Time",
    salary_type: stripTags(r.salary_type).trim() || "fixed",
    salary_min: num(r.salary_min),
    salary_max: num(r.salary_max),
    min_years_experience: coerceYears(r.min_years_experience),
    experience_template: stripTags(r.experience_template),
    responsibilities_template: stripTags(r.responsibilities_template),
    benefits_template: stripTags(r.benefits_template),
    // Date inputs only -- anything that isn't YYYY-MM-DD is treated as blank
    // so a malformed value defaults to the +30d fallback instead of writing
    // garbage into a date column.
    deadline: /^\d{4}-\d{2}-\d{2}$/.test(String(r.deadline ?? "")) ? String(r.deadline) : "",
    quantity: Math.max(1, num(r.quantity) ?? 1),
    education_requirements: stripTags(r.education_requirements),
  };
}

// ── Description composition ──────────────────────────────────────────────────
// Markers must match vacancyShared.ts exactly: the web dashboard's edit form
// splits a stored description back apart on these strings.

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

/** Builds the flat description string stored on the `jobs` row. */
export function buildJobDescription(
  form: Pick<
    VacancyFormState,
    "description_template" | "responsibilities_template" | "requirements_template" | "experience_template" | "benefits_template"
  >,
) {
  let desc = formatList(form.description_template || "");
  if (form.responsibilities_template) desc += RESP_MARKER + formatList(form.responsibilities_template);
  if (form.requirements_template) desc += REQ_MARKER + formatList(form.requirements_template);
  if (form.experience_template) desc += EXP_MARKER + formatList(form.experience_template);
  if (form.benefits_template) desc += BEN_MARKER + formatList(form.benefits_template);
  return desc;
}

/** Resolves the structured salary into the sentinel-encoded numeric pair stored
 *  on `jobs.salary_min` / `jobs.salary_max` (-1 = negotiable, -2 = company
 *  scale). The seeker app reads those sentinels directly. */
export function resolveSalary(form: { salary_type?: string | null; salary_min?: number | null; salary_max?: number | null }) {
  if (form.salary_type === "negotiable") return { salary_min: -1, salary_max: -1 };
  if (form.salary_type === "company_scale") return { salary_min: -2, salary_max: -2 };
  const salary_min = form.salary_min ?? 0;
  const salary_max = form.salary_max ?? form.salary_min ?? 0;
  return { salary_min, salary_max };
}

/** Experience is deliberately absent: it now lives on `jobs.min_years_experience`
 *  as a real integer column. This jsonb keeps only the free-text fields. */
export function buildRequirementsJson(form: { education_requirements?: string | null }) {
  return {
    education: form.education_requirements || "",
    languages: [] as string[],
    locationPreference: null as string | null,
    workingHours: null as string | null,
  };
}

// ── Validation ───────────────────────────────────────────────────────────────

/** Single source of truth for job-form validation, mirroring
 *  validateVacancyForm() in vacancyShared.ts. Returns the first problem as a
 *  user-facing sentence, or null when the form is good. */
export function validateVacancyForm(
  form: Pick<VacancyFormState, "title" | "description_template" | "deadline"> &
    Partial<Pick<VacancyFormState, "min_years_experience">>,
  opts?: { requireDeadline?: boolean; maxDeadline?: string | null },
): string | null {
  if (!form.title?.trim()) return "Job Title is required.";
  if (!form.description_template?.trim()) return "Job Description is required.";

  // Blank means "no minimum stated" and is fine; a value that is present but
  // nonsensical is not. Catches typos like 200 before they reach the column.
  const years = form.min_years_experience;
  if (years != null && (!Number.isFinite(years) || years < 0 || years > MAX_YEARS_INPUT)) {
    return `Years of experience must be between 0 and ${MAX_YEARS_INPUT}.`;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // A blank deadline is fine outside of a repost -- resolveDeadline() fills in
  // a sensible default. But whenever one IS given it can't be in the past and
  // can't outlive the employer's current plan.
  if (opts?.requireDeadline && !form.deadline) {
    return "A new deadline is required to repost this job.";
  }
  if (form.deadline && new Date(form.deadline) < today) {
    return "Deadline must be today or later.";
  }
  if (form.deadline && opts?.maxDeadline && form.deadline > opts.maxDeadline) {
    return `Deadline can't be later than ${opts.maxDeadline} — that's when your current plan ends.`;
  }
  return null;
}

// ── Publishing rules ─────────────────────────────────────────────────────────

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

export interface PublishingRules {
  autoPublish: boolean;
  dailyPostLimit: number;
  /** Date-only (YYYY-MM-DD) so it compares cleanly against `deadline`, which
   *  is itself a plain date with no time component. */
  packageExpiresAt: string | null;
  isExpired: boolean;
}

export async function getEmployerPublishingRules(supabase: SupabaseClient, employerId: string): Promise<PublishingRules> {
  const { data } = await supabase
    .from("employers")
    .select("auto_publish, daily_post_limit, package_expires_at")
    .eq("id", employerId)
    .single();

  // No package at all is treated the same as an expired one -- posting always
  // requires a currently-valid package.
  const isExpired = !data?.package_expires_at || new Date(data.package_expires_at) < new Date();
  return {
    autoPublish: !!data?.auto_publish,
    dailyPostLimit: data?.daily_post_limit ?? 15,
    packageExpiresAt: data?.package_expires_at ? String(data.package_expires_at).split("T")[0] : null,
    isExpired,
  };
}

/** Employers can't set a deadline past their current plan's end date. A blank
 *  deadline defaults to 30 days out, clamped to that same cutoff. */
export function resolveDeadline(formDeadline: string | null | undefined, maxDeadline: string | null): string {
  if (formDeadline) return formDeadline;
  const fallback = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  return maxDeadline && fallback > maxDeadline ? maxDeadline : fallback;
}

/** A template is written once and posted for months, so its stored deadline
 *  goes stale: by the time it's used it may be in the past, or may now sit
 *  beyond the plan's end date. Either would produce a job that is dead on
 *  arrival, so a one-tap post treats a stale deadline as no deadline and lets
 *  resolveDeadline() supply the usual +30d (clamped) default.
 *
 *  This is the one place the Mini App's quick-post is deliberately stricter
 *  than the web dashboard's, which posts a stale template deadline as-is. */
export function normalizeTemplateDeadline(deadline: string | null | undefined, maxDeadline: string | null): string {
  const today = new Date().toISOString().split("T")[0];
  const isUsable = !!deadline && /^\d{4}-\d{2}-\d{2}$/.test(deadline) && deadline >= today && (!maxDeadline || deadline <= maxDeadline);
  return resolveDeadline(isUsable ? deadline! : "", maxDeadline);
}

/** Counts against last_posted_at rather than created_at, so a repost of an
 *  expired job counts as one of today's posts exactly like a fresh post does. */
export async function getTodayPostCount(supabase: SupabaseClient, employerId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("employer_id", employerId)
    .gte("last_posted_at", startOfDay.toISOString());
  return count || 0;
}

export function dailyLimitMessage(limit: number) {
  return `You've reached your daily posting limit of ${limit} job${limit === 1 ? "" : "s"}. Please try again tomorrow.`;
}

export const EXPIRED_PACKAGE_MESSAGE =
  "Your subscription has expired. Renew your plan to keep posting jobs.";

/** Runs every gate that stands between an employer and a new job row:
 *  subscription still valid, form valid against the plan's end date, and
 *  today's post allowance not yet spent. Returns the resolved values the
 *  caller needs to build the insert, or the message to show instead. */
export async function checkCanPost(
  supabase: SupabaseClient,
  employerId: string,
  form: Pick<VacancyFormState, "title" | "description_template" | "deadline">,
): Promise<{ ok: true; rules: PublishingRules; deadline: string; status: "active" | "pending" } | { ok: false; error: string }> {
  const rules = await getEmployerPublishingRules(supabase, employerId);
  if (rules.isExpired) return { ok: false, error: EXPIRED_PACKAGE_MESSAGE };

  const validationError = validateVacancyForm(form, { maxDeadline: rules.packageExpiresAt });
  if (validationError) return { ok: false, error: validationError };

  if (rules.dailyPostLimit !== -1) {
    const postedToday = await getTodayPostCount(supabase, employerId);
    if (postedToday >= rules.dailyPostLimit) return { ok: false, error: dailyLimitMessage(rules.dailyPostLimit) };
  }

  return {
    ok: true,
    rules,
    deadline: resolveDeadline(form.deadline, rules.packageExpiresAt),
    // The employer's trust flag decides whether the job is live immediately or
    // queued for admin review -- never the surface it was posted from.
    status: rules.autoPublish ? "active" : "pending",
  };
}

// ── Employer identity ────────────────────────────────────────────────────────

export interface EmployerContext {
  employerId: string;
  businessName: string;
  businessType: string | null;
  logoUrl: string | null;
  status: string;
}

/** Resolves the Telegram user behind a request to their employer record.
 *  Returns a message instead of throwing so each handler can answer with the
 *  right status code. */
export async function resolveEmployer(
  supabase: SupabaseClient,
  telegramId: number,
): Promise<{ ok: true; employer: EmployerContext } | { ok: false; error: string; status: number }> {
  const { data: userRow } = await supabase.from("users").select("id, role").eq("telegram_id", telegramId).single();
  if (!userRow) return { ok: false, error: "Employer user not found.", status: 404 };
  if (userRow.role !== "employer") return { ok: false, error: "This account is not an employer account.", status: 403 };

  const { data: employer } = await supabase
    .from("employers")
    .select("id, business_name, business_type, logo_url, status")
    .eq("user_id", userRow.id)
    .single();
  if (!employer) return { ok: false, error: "Employer profile not found.", status: 404 };

  if (employer.status !== "approved") {
    return { ok: false, error: "Your employer account is awaiting approval, so posting is disabled.", status: 403 };
  }

  return {
    ok: true,
    employer: {
      employerId: employer.id,
      businessName: employer.business_name,
      businessType: employer.business_type ?? null,
      logoUrl: employer.logo_url ?? null,
      status: employer.status,
    },
  };
}

/** Mirrors logEmployerActivity() in employerServerUtils.ts so Mini App posts
 *  show up in the admin dashboard's Employer Activity panel next to web ones,
 *  distinguishable only by metadata.surface. Never throws -- a lost log line
 *  must not fail a job that was posted successfully. */
export async function logEmployerActivity(
  supabase: SupabaseClient,
  employer: EmployerContext,
  action: string,
  target?: string | null,
  // deno-lint-ignore no-explicit-any
  metadata?: Record<string, any>,
) {
  try {
    await supabase.from("activity_log").insert({
      actor: employer.businessName,
      action,
      target: target || null,
      metadata: { ...metadata, source: "employer", surface: "telegram", employerId: employer.employerId },
    });
  } catch (err) {
    console.error("Failed to write employer activity log:", err);
  }
}
