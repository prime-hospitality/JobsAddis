"use server";

import { getSupabase, requireEmployer, logEmployerActivity, activateBonusDays } from "../shared/employerServerUtils";
import { isSubscriptionExpired } from "@/lib/subscriptionStatus";
import { startOfAddisDay } from "@/lib/addisDay";
import {
  VacancyFormState,
  buildJobDescription,
  buildRequirementsJson,
  coerceGender,
  coerceYears,
  resolveSalary,
  validateVacancyForm as validateVacancyFormShared,
} from "./vacancyShared";

/** How many times a single job may appear in the Telegram group per day,
 *  by plan tier. The mini app shows a vacancy once and that is enough --
 *  the group is a feed, where a post is buried by the next twenty, so
 *  visibility there is bought in repeats. The employer's very first
 *  announcement counts as one of these, not as a freebie on top. */
const GROUP_BOOSTS_PER_DAY = { standard: 3, premium: 5 } as const;

async function getEmployerPublishingRules(supabase: ReturnType<typeof getSupabase>, employerId: string) {
  // Before the read, not after: every rule below is derived from
  // package_expires_at, and starting a due bonus term is precisely what moves
  // it. Reading first would gate this employer on a lapse the bonus has
  // already covered.
  await activateBonusDays(supabase, employerId);

  const { data } = await supabase
    .from("employers")
    .select("auto_publish, daily_post_limit, package_expires_at, renewal_requested_at, renewal_seen_at, packages(category)")
    .eq("id", employerId)
    .single();
  const pkg = (data as any)?.packages;
  const tier = (Array.isArray(pkg) ? pkg[0]?.category : pkg?.category) === "premium" ? "premium" : "standard";
  return {
    autoPublish: !!data?.auto_publish,
    dailyPostLimit: data?.daily_post_limit ?? 15,
    // An employer with no package assigned falls back to standard rather than
    // to nothing -- the subscription check is what gates access, and it runs
    // separately. This only decides how generous the cap is once they're in.
    tier,
    groupBoostsPerDay: GROUP_BOOSTS_PER_DAY[tier],
    // Date-only (YYYY-MM-DD) so it compares cleanly against the deadline
    // field, which is itself a plain date with no time component.
    packageExpiresAt: data?.package_expires_at ? String(data.package_expires_at).split("T")[0] : null,
    // Full precision, unrounded -- for applicant-lock math where a same-day
    // cutoff matters. The date-only field above must stay date-only since it
    // feeds the deadline <input type="date"> max attribute.
    packageExpiresAtRaw: data?.package_expires_at ?? null,
    isExpired: isSubscriptionExpired(data?.package_expires_at),
    renewalRequestedAt: data?.renewal_requested_at ?? null,
    renewalSeenAt: data?.renewal_seen_at ?? null,
  };
}

// Employers can't set a job deadline past their current plan's end date.
// When they leave the deadline blank, default to 30 days out same as
// before, but clamped to that same cutoff.
function resolveDeadline(formDeadline: string | null | undefined, maxDeadline: string | null): string {
  if (formDeadline) return formDeadline;
  const fallback = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  return maxDeadline && fallback > maxDeadline ? maxDeadline : fallback;
}

// Counts against last_posted_at (not created_at) so that a repost of an expired
// job counts as one of today's posts, same as a fresh "Post Now".
async function getTodayPostCount(supabase: ReturnType<typeof getSupabase>, employerId: string) {
  const { count } = await supabase
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("employer_id", employerId)
    .gte("last_posted_at", startOfAddisDay().toISOString());
  return count || 0;
}

function validateVacancyForm(form: VacancyFormState, opts?: { requireDeadline?: boolean; maxDeadline?: string | null }): string | null {
  const errors = validateVacancyFormShared(form, opts);
  return errors ? Object.values(errors)[0]! : null;
}

export async function getEmployerPostingData() {
  const session = await requireEmployer();
  if (!session) throw new Error("Unauthorized");

  const supabase = getSupabase();
  const startOfDay = startOfAddisDay();
  const [jobsRes, templatesRes, rules, applicationsRes, groupPostsRes] = await Promise.all([
    supabase.from("jobs").select("*").eq("employer_id", session.employerId).order("last_posted_at", { ascending: false }),
    supabase.from("employer_vacancy_templates").select("*").eq("employer_id", session.employerId).order("created_at", { ascending: false }),
    getEmployerPublishingRules(supabase, session.employerId),
    supabase.from("applications").select("job_id, status, created_at, jobs!inner ( employer_id )").eq("jobs.employer_id", session.employerId),
    supabase
      .from("job_group_posts")
      .select("job_id, jobs!inner ( employer_id )")
      .eq("jobs.employer_id", session.employerId)
      .gte("posted_at", startOfDay.toISOString()),
  ]);

  // Per-job applicant/shortlisted/locked counts, so each posting can show how
  // many people applied, how many were shortlisted (for the past-deadline
  // advisory), and how many arrived after the subscription lapsed (for the
  // "renew to view" nudge) -- all from the one query above.
  const applicantCounts: Record<string, number> = {};
  const shortlistedCounts: Record<string, number> = {};
  const lockedCounts: Record<string, number> = {};
  const expiresAtMs = rules.packageExpiresAtRaw ? new Date(rules.packageExpiresAtRaw).getTime() : -Infinity;
  for (const row of applicationsRes.data || []) {
    const jobId = (row as any).job_id as string;
    applicantCounts[jobId] = (applicantCounts[jobId] ?? 0) + 1;
    if ((row as any).status === "shortlisted") shortlistedCounts[jobId] = (shortlistedCounts[jobId] ?? 0) + 1;
    if (new Date((row as any).created_at).getTime() > expiresAtMs) lockedCounts[jobId] = (lockedCounts[jobId] ?? 0) + 1;
  }

  // How many times each job has reached the group today, so a card can show
  // what's left of its allowance without a round trip per card.
  const groupPostsToday: Record<string, number> = {};
  for (const row of groupPostsRes.data || []) {
    const jobId = (row as any).job_id as string;
    groupPostsToday[jobId] = (groupPostsToday[jobId] ?? 0) + 1;
  }

  return {
    jobs: jobsRes.data || [],
    templates: templatesRes.data || [],
    applicantCounts,
    shortlistedCounts,
    lockedCounts,
    groupPostsToday,
    groupBoostsPerDay: rules.groupBoostsPerDay,
    autoPublish: rules.autoPublish,
    dailyPostLimit: rules.dailyPostLimit,
    packageExpiresAt: rules.packageExpiresAt,
    packageExpiresAtRaw: rules.packageExpiresAtRaw,
    renewalRequestedAt: rules.renewalRequestedAt,
    renewalSeenAt: rules.renewalSeenAt,
    employerId: session.employerId,
    businessName: session.businessName,
    businessType: session.businessType,
    logoUrl: session.logoUrl || null,
  };
}

/** "Mark as Filled" on a Post-tab card -- closes the job to new applicants
 *  without deleting it. Reuses the existing 'closed' status (already excluded
 *  from every seeker-facing query the same way 'expired' is); filled_at is
 *  what distinguishes this from an admin-moderated close. The employer can
 *  repost it later if the role opens up again -- see repostEmployerJob, which
 *  is what filled_at gates on. */
export async function markJobAsFilled(jobId: string): Promise<{ success: true } | { success: false; error: string }> {
  const session = await requireEmployer();
  if (!session) return { success: false, error: "Unauthorized" };

  const supabase = getSupabase();
  const { data: existing } = await supabase.from("jobs").select("id, employer_id, title, status").eq("id", jobId).maybeSingle();
  if (!existing || existing.employer_id !== session.employerId) return { success: false, error: "Job not found" };
  if (existing.status !== "active" && existing.status !== "expired") {
    return { success: false, error: "Only active or expired jobs can be marked as filled." };
  }

  const { error } = await supabase
    .from("jobs")
    .update({ status: "closed", filled_at: new Date().toISOString() })
    .eq("id", jobId);

  if (error) return { success: false, error: error.message || "Failed to update job" };
  await logEmployerActivity(session, "employer_mark_job_filled", existing.title);
  return { success: true };
}

/** Counts how many times a job has already been announced to the group today.
 *  Shares its notion of "today" with getTodayPostCount above so the two daily
 *  allowances on the same dashboard roll over at the same moment. */
async function getTodayGroupPostCount(supabase: ReturnType<typeof getSupabase>, jobId: string) {
  const { count } = await supabase
    .from("job_group_posts")
    .select("id", { count: "exact", head: true })
    .eq("job_id", jobId)
    .gte("posted_at", startOfAddisDay().toISOString());
  return count || 0;
}

/** "Repost to group" on a live job card — puts the vacancy back at the top of
 *  the Telegram group without touching the mini app.
 *
 *  The two surfaces want opposite things. In the mini app a vacancy is a row in
 *  a searchable list, so posting it twice is duplication with no upside. In the
 *  group it is a message in a feed, and by the next morning it is a hundred
 *  messages down; the only way back to the top is to say it again. So this
 *  boosts one and deliberately leaves the other alone: the job row is not
 *  modified, its status stays 'active', and last_posted_at is untouched, which
 *  means a boost costs nothing against the daily *posting* limit. It draws on
 *  its own smaller allowance instead — GROUP_BOOSTS_PER_DAY, per job, per day.
 *
 *  Nothing here talks to Telegram. Clearing announced_at hands the job back to
 *  the same every-minute sweep that announced it the first time, which already
 *  has the bot token, the claim-then-act guard against double posting, and the
 *  retry budget. The sweep also skips the seeker DM fan-out on its own, keyed
 *  off alerts_queued_at, so a boost reaches the group without re-notifying
 *  everyone who was already told about this job. */
export async function boostJobToGroup(jobId: string): Promise<{ success: true; used: number; limit: number } | { success: false; error: string }> {
  const session = await requireEmployer();
  if (!session) return { success: false, error: "Unauthorized" };

  const supabase = getSupabase();
  const rules = await getEmployerPublishingRules(supabase, session.employerId);
  if (rules.isExpired) return { success: false, error: "Your subscription has expired. Renew your plan to keep posting to the group." };

  const { data: job } = await supabase
    .from("jobs")
    .select("id, employer_id, title, status, deadline, announced_at")
    .eq("id", jobId)
    .maybeSingle();
  if (!job || job.employer_id !== session.employerId) return { success: false, error: "Job not found" };

  if (job.status !== "active") {
    return { success: false, error: "Only a job that's currently live can be reposted to the group." };
  }
  // A job past its deadline is still 'active' until the next sweep flips it.
  // Announcing one in that window would put a vacancy in the group that the
  // app itself is about to stop accepting applications for.
  if (job.deadline && new Date(job.deadline).getTime() < Date.now()) {
    return { success: false, error: "This job's deadline has passed. Extend it first, then repost to the group." };
  }
  // announced_at is null only while a post is claimed but not yet sent, so this
  // is also what stops a double-click from spending two of the day's boosts on
  // one appearance.
  if (!job.announced_at) {
    return { success: false, error: "This job is already queued for the group — it'll appear within a minute." };
  }

  const used = await getTodayGroupPostCount(supabase, jobId);
  if (used >= rules.groupBoostsPerDay) {
    return {
      success: false,
      error: `This job has already been posted to the group ${used} time${used === 1 ? "" : "s"} today, the most your ${rules.tier} plan allows. You can post it again tomorrow.`,
    };
  }

  const { error } = await supabase
    .from("jobs")
    // announce_attempts back to zero as well: the budget is per announcement,
    // and a job that burned its retries on a bad night must not start this
    // boost already written off.
    .update({ announced_at: null, announce_attempts: 0 })
    .eq("id", jobId)
    .eq("employer_id", session.employerId);

  if (error) return { success: false, error: error.message || "Failed to queue the group post" };
  await logEmployerActivity(session, "employer_boost_job_to_group", job.title, { used: used + 1, limit: rules.groupBoostsPerDay });
  return { success: true, used: used + 1, limit: rules.groupBoostsPerDay };
}

/** "Post Now" on the Post tab — creates a new job directly for this employer. */
export async function createEmployerJob(form: VacancyFormState): Promise<{ success: true; status: "active" | "pending" } | { success: false; error: string }> {
  const session = await requireEmployer();
  if (!session) return { success: false, error: "Unauthorized" };

  const supabase = getSupabase();
  const rules = await getEmployerPublishingRules(supabase, session.employerId);
  if (rules.isExpired) return { success: false, error: "Your subscription has expired. Renew your plan to keep posting jobs." };

  const validationError = validateVacancyForm(form, { maxDeadline: rules.packageExpiresAt });
  if (validationError) return { success: false, error: validationError };

  if (rules.dailyPostLimit !== -1) {
    const postedToday = await getTodayPostCount(supabase, session.employerId);
    if (postedToday >= rules.dailyPostLimit) {
      return { success: false, error: `You've reached your daily posting limit of ${rules.dailyPostLimit} job${rules.dailyPostLimit === 1 ? "" : "s"}. Please try again tomorrow.` };
    }
  }

  const description = buildJobDescription(form);
  const { salary_min, salary_max } = resolveSalary(form);

  const { error } = await supabase.from("jobs").insert({
    employer_id: session.employerId,
    title: form.title,
    category: form.job_category,
    location: form.location || "Addis Ababa",
    neighborhood: form.location || "Addis Ababa",
    job_type: form.employment_type || "Full Time",
    salary_min,
    salary_max,
    currency: "ETB",
    description,
    full_description: description,
    requirements: buildRequirementsJson(form),
    min_years_experience: form.min_years_experience,
    gender_preference: coerceGender(form.gender_preference),
    deadline: resolveDeadline(form.deadline, rules.packageExpiresAt),
    quantity: form.quantity || 1,
    status: rules.autoPublish ? "active" : "pending",
  });

  if (error) return { success: false, error: error.message || "Failed to post job" };
  await logEmployerActivity(session, "employer_post_job", form.title, { status: rules.autoPublish ? "active" : "pending" });
  return { success: true, status: rules.autoPublish ? "active" : "pending" };
}

/** Edit button on a Post-tab card — updates an existing job owned by this employer. */
export async function updateEmployerJobPost(jobId: string, form: VacancyFormState): Promise<{ success: true } | { success: false; error: string }> {
  const session = await requireEmployer();
  if (!session) return { success: false, error: "Unauthorized" };

  const supabase = getSupabase();
  const rules = await getEmployerPublishingRules(supabase, session.employerId);

  const validationError = validateVacancyForm(form, { maxDeadline: rules.packageExpiresAt });
  if (validationError) return { success: false, error: validationError };

  const { data: existing } = await supabase.from("jobs").select("id, employer_id, announced_message_id").eq("id", jobId).maybeSingle();
  if (!existing || existing.employer_id !== session.employerId) return { success: false, error: "Job not found" };

  const description = buildJobDescription(form);
  const { salary_min, salary_max } = resolveSalary(form);

  const { error } = await supabase
    .from("jobs")
    .update({
      title: form.title,
      category: form.job_category,
      location: form.location || "Addis Ababa",
      neighborhood: form.location || "Addis Ababa",
      job_type: form.employment_type || "Full Time",
      salary_min,
      salary_max,
      currency: "ETB",
      description,
      full_description: description,
      requirements: buildRequirementsJson(form),
      min_years_experience: form.min_years_experience,
      gender_preference: coerceGender(form.gender_preference),
      deadline: resolveDeadline(form.deadline, rules.packageExpiresAt),
      quantity: form.quantity || 1,
      ...(existing.announced_message_id ? { announcement_needs_update: true } : {}),
    })
    .eq("id", jobId);

  if (error) return { success: false, error: error.message || "Failed to update job" };
  await logEmployerActivity(session, "employer_edit_job", form.title);
  return { success: true };
}

/** Repost button on an expired or filled job card — requires a new (future)
 *  deadline, is gated by the same daily posting limit as a fresh post, and
 *  re-runs the employer's auto_publish routing (active if they have "post
 *  without review", otherwise back to pending for admin review). Updates the
 *  existing row in place rather than creating a new job.
 *
 *  'closed' is only repostable when filled_at is set. Three things produce a
 *  closed job and only one of them is the employer's own doing: Mark as Filled
 *  (filled_at stamped), an admin closing it from the moderation dashboard, and
 *  a cancelled scheduled post. Letting the employer repost out of 'closed'
 *  unconditionally would hand them a one-click undo for an admin's moderation
 *  decision, so filled_at is the gate rather than the status alone. */
export async function repostEmployerJob(jobId: string, form: VacancyFormState): Promise<{ success: true; status: "active" | "pending" } | { success: false; error: string }> {
  const session = await requireEmployer();
  if (!session) return { success: false, error: "Unauthorized" };

  const supabase = getSupabase();
  const rules = await getEmployerPublishingRules(supabase, session.employerId);
  if (rules.isExpired) return { success: false, error: "Your subscription has expired. Renew your plan to keep posting jobs." };

  const validationError = validateVacancyForm(form, { requireDeadline: true, maxDeadline: rules.packageExpiresAt });
  if (validationError) return { success: false, error: validationError };

  const { data: existing } = await supabase.from("jobs").select("id, employer_id, status, deadline, filled_at").eq("id", jobId).maybeSingle();
  if (!existing || existing.employer_id !== session.employerId) return { success: false, error: "Job not found" };
  const repostable = existing.status === "expired" || (existing.status === "closed" && !!existing.filled_at);
  if (!repostable) return { success: false, error: "Only expired or filled jobs can be reposted." };

  if (rules.dailyPostLimit !== -1) {
    const postedToday = await getTodayPostCount(supabase, session.employerId);
    if (postedToday >= rules.dailyPostLimit) {
      return { success: false, error: `You've reached your daily posting limit of ${rules.dailyPostLimit} job${rules.dailyPostLimit === 1 ? "" : "s"}. Please try again tomorrow.` };
    }
  }

  const description = buildJobDescription(form);
  const { salary_min, salary_max } = resolveSalary(form);
  const newStatus: "active" | "pending" = rules.autoPublish ? "active" : "pending";

  const { error } = await supabase
    .from("jobs")
    .update({
      title: form.title,
      category: form.job_category,
      location: form.location || "Addis Ababa",
      neighborhood: form.location || "Addis Ababa",
      job_type: form.employment_type || "Full Time",
      salary_min,
      salary_max,
      currency: "ETB",
      description,
      full_description: description,
      requirements: buildRequirementsJson(form),
      min_years_experience: form.min_years_experience,
      gender_preference: coerceGender(form.gender_preference),
      deadline: form.deadline,
      quantity: form.quantity || 1,
      status: newStatus,
      // Stamp the repost time: makes this count toward today's post limit,
      // floats the job to the top of the feed, and shows it as freshly posted
      // to seekers — while created_at stays as the original post date.
      last_posted_at: new Date().toISOString(),
      // The role is open again, so the "filled" stamp has to go. Leaving it set
      // would outlive this repost: when the new deadline passes, the expired
      // card checks `!filled_at` to decide whether to show the "Deadline ended
      // — mark as filled / extend" advisory, and a stale stamp silently
      // suppresses it.
      filled_at: null,
      // Hand the job back to the announce sweep so the group hears about it
      // again. Without this a reposted vacancy returns to the mini app in
      // silence: `announced_at` still carries the stamp from its first run, and
      // the sweep only ever looks at jobs where it is null.
      //
      // alerts_queued_at goes with it, which re-opens the DM fan-out to seekers
      // subscribed to this category. That is the line between the two kinds of
      // repost: this one is a fresh hiring round -- the last round ended, in a
      // hire or in a lapsed deadline, and these are new openings people want to
      // hear about. A group boost is the same round said louder, so it leaves
      // this field alone and nobody is DMed twice for one vacancy.
      announced_at: null,
      announced_message_id: null,
      announce_attempts: 0,
      alerts_queued_at: null,
    })
    .eq("id", jobId);

  if (error) return { success: false, error: error.message || "Failed to repost job" };
  await logEmployerActivity(session, "employer_repost_job", form.title, { status: newStatus, previousDeadline: existing.deadline, newDeadline: form.deadline });
  return { success: true, status: newStatus };
}

export async function deleteEmployerJob(jobId: string): Promise<{ success: true } | { success: false; error: string }> {
  const session = await requireEmployer();
  if (!session) return { success: false, error: "Unauthorized" };

  const supabase = getSupabase();
  const { data: existing } = await supabase.from("jobs").select("id, employer_id, title").eq("id", jobId).maybeSingle();
  if (!existing || existing.employer_id !== session.employerId) return { success: false, error: "Job not found" };

  const { error } = await supabase.from("jobs").delete().eq("id", jobId).eq("employer_id", session.employerId);
  if (error) return { success: false, error: error.message || "Failed to delete job" };
  await logEmployerActivity(session, "employer_delete_job", existing.title);
  return { success: true };
}

export async function upsertEmployerVacancyTemplate(payload: VacancyFormState) {
  const session = await requireEmployer();
  if (!session) return { success: false, error: "Unauthorized" };

  const supabase = getSupabase();
  const rules = await getEmployerPublishingRules(supabase, session.employerId);

  const validationError = validateVacancyForm(payload, { maxDeadline: rules.packageExpiresAt });
  if (validationError) return { success: false, error: validationError };

  const { id, ...data } = payload;

  if (id) {
    const { data: existing } = await supabase.from("employer_vacancy_templates").select("id, employer_id").eq("id", id).maybeSingle();
    if (!existing || existing.employer_id !== session.employerId) return { success: false, error: "Template not found" };
  }

  const dbPayload = {
    ...(id ? { id } : {}),
    employer_id: session.employerId,
    title: data.title,
    job_category: data.job_category,
    description_template: data.description_template,
    requirements_template: data.requirements_template,
    location: data.location,
    employment_type: data.employment_type,
    salary_type: data.salary_type,
    salary_min: data.salary_min,
    salary_max: data.salary_max,
    salary_currency: "ETB",
    salary_period: "Monthly",
    min_years_experience: data.min_years_experience,
    gender_preference: coerceGender(data.gender_preference),
    experience_template: data.experience_template,
    responsibilities_template: data.responsibilities_template,
    benefits_template: data.benefits_template,
    deadline: data.deadline || null,
    quantity: data.quantity || 1,
    education_requirements: data.education_requirements || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("employer_vacancy_templates").upsert(dbPayload);
  if (error) return { success: false, error: error.message || "Failed to save template" };
  await logEmployerActivity(session, id ? "employer_edit_template" : "employer_create_template", data.title);
  return { success: true };
}

export async function deleteEmployerVacancyTemplate(id: string) {
  const session = await requireEmployer();
  if (!session) return { success: false, error: "Unauthorized" };

  const supabase = getSupabase();
  const { data: existing } = await supabase.from("employer_vacancy_templates").select("id, employer_id, title").eq("id", id).maybeSingle();
  if (!existing || existing.employer_id !== session.employerId) return { success: false, error: "Template not found" };

  const { error } = await supabase.from("employer_vacancy_templates").delete().eq("id", id).eq("employer_id", session.employerId);
  if (error) return { success: false, error: error.message };
  await logEmployerActivity(session, "employer_delete_template", existing.title);
  return { success: true };
}

export async function checkEmployerTemplateStatus(templateId: string) {
  const session = await requireEmployer();
  if (!session) throw new Error("Unauthorized");

  const supabase = getSupabase();
  const { data: tpl } = await supabase
    .from("employer_vacancy_templates")
    .select("title, updated_at, employer_id")
    .eq("id", templateId)
    .single();
  if (!tpl || tpl.employer_id !== session.employerId) return null;

  const { data: job } = await supabase
    .from("jobs")
    .select("created_at")
    .eq("employer_id", session.employerId)
    .eq("title", tpl.title)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!job) return { status: "new" as const };

  const tplUpdated = new Date(tpl.updated_at || Date.now()).getTime();
  const jobCreated = new Date(job.created_at).getTime();

  if (jobCreated > tplUpdated) return { status: "same" as const, lastPosted: job.created_at };
  return { status: "changed" as const, lastPosted: job.created_at };
}

async function loadOwnedTemplate(supabase: ReturnType<typeof getSupabase>, employerId: string, templateId: string) {
  const { data: tpl } = await supabase.from("employer_vacancy_templates").select("*").eq("id", templateId).single();
  if (!tpl || tpl.employer_id !== employerId) return null;
  return tpl;
}

export async function postJobFromEmployerTemplate(templateId: string) {
  const session = await requireEmployer();
  if (!session) return { success: false, error: "Unauthorized" };

  const supabase = getSupabase();
  const tpl = await loadOwnedTemplate(supabase, session.employerId, templateId);
  if (!tpl) return { success: false, error: "Template not found" };

  const rules = await getEmployerPublishingRules(supabase, session.employerId);
  if (rules.isExpired) return { success: false, error: "Your subscription has expired. Renew your plan to keep posting jobs." };
  if (rules.dailyPostLimit !== -1) {
    const postedToday = await getTodayPostCount(supabase, session.employerId);
    if (postedToday >= rules.dailyPostLimit) {
      return { success: false, error: `You've reached your daily posting limit of ${rules.dailyPostLimit} job${rules.dailyPostLimit === 1 ? "" : "s"}. Please try again tomorrow.` };
    }
  }

  const description = buildJobDescription(tpl as any);
  const { salary_min, salary_max } = resolveSalary(tpl as any);

  const { error } = await supabase.from("jobs").insert({
    employer_id: session.employerId,
    title: tpl.title,
    category: tpl.job_category,
    location: tpl.location || "Addis Ababa",
    neighborhood: tpl.location || "Addis Ababa",
    job_type: tpl.employment_type || "Full Time",
    salary_min,
    salary_max,
    currency: tpl.salary_currency || "ETB",
    description,
    full_description: description,
    requirements: buildRequirementsJson(tpl as any),
    min_years_experience: coerceYears((tpl as any).min_years_experience),
    gender_preference: coerceGender((tpl as any).gender_preference),
    deadline: resolveDeadline(tpl.deadline, rules.packageExpiresAt),
    quantity: tpl.quantity || 1,
    status: rules.autoPublish ? "active" : "pending",
  });

  if (error) return { success: false, error: error.message || "Failed to post job" };
  await logEmployerActivity(session, "employer_post_from_template", tpl.title, { status: rules.autoPublish ? "active" : "pending" });
  return { success: true };
}

export async function scheduleJobFromEmployerTemplate(templateId: string, scheduledAt: string) {
  const session = await requireEmployer();
  if (!session) return { success: false, error: "Unauthorized" };

  const supabase = getSupabase();
  const tpl = await loadOwnedTemplate(supabase, session.employerId, templateId);
  if (!tpl) return { success: false, error: "Template not found" };

  const rules = await getEmployerPublishingRules(supabase, session.employerId);
  if (rules.isExpired) return { success: false, error: "Your subscription has expired. Renew your plan to keep posting jobs." };
  if (rules.dailyPostLimit !== -1) {
    const postedToday = await getTodayPostCount(supabase, session.employerId);
    if (postedToday >= rules.dailyPostLimit) {
      return { success: false, error: `You've reached your daily posting limit of ${rules.dailyPostLimit} job${rules.dailyPostLimit === 1 ? "" : "s"}. Please try again tomorrow.` };
    }
  }

  const description = buildJobDescription(tpl as any);
  const { salary_min, salary_max } = resolveSalary(tpl as any);

  const { error } = await supabase.from("jobs").insert({
    employer_id: session.employerId,
    title: tpl.title,
    category: tpl.job_category,
    location: tpl.location || "Addis Ababa",
    neighborhood: tpl.location || "Addis Ababa",
    job_type: tpl.employment_type || "Full Time",
    salary_min,
    salary_max,
    currency: tpl.salary_currency || "ETB",
    description,
    full_description: description,
    requirements: buildRequirementsJson(tpl as any),
    min_years_experience: coerceYears((tpl as any).min_years_experience),
    gender_preference: coerceGender((tpl as any).gender_preference),
    deadline: resolveDeadline(tpl.deadline, rules.packageExpiresAt),
    quantity: tpl.quantity || 1,
    status: "scheduled",
    scheduled_at: scheduledAt,
  });

  if (error) return { success: false, error: error.message || "Failed to schedule publication" };
  await logEmployerActivity(session, "employer_schedule_post", tpl.title, { scheduledAt });
  return { success: true };
}
