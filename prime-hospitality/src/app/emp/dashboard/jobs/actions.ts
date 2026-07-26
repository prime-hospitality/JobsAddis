"use server";

import { getSupabase, requireEmployer, logEmployerActivity } from "../shared/employerServerUtils";
import {
  VacancyFormState,
  buildJobDescription,
  buildRequirementsJson,
  resolveSalary,
  validateVacancyForm as validateVacancyFormShared,
} from "./vacancyShared";

async function getEmployerPublishingRules(supabase: ReturnType<typeof getSupabase>, employerId: string) {
  const { data } = await supabase
    .from("employers")
    .select("auto_publish, daily_post_limit")
    .eq("id", employerId)
    .single();
  return {
    autoPublish: !!data?.auto_publish,
    dailyPostLimit: data?.daily_post_limit ?? 15,
  };
}

// Counts against last_posted_at (not created_at) so that a repost of an expired
// job counts as one of today's posts, same as a fresh "Post Now".
async function getTodayPostCount(supabase: ReturnType<typeof getSupabase>, employerId: string) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("employer_id", employerId)
    .gte("last_posted_at", startOfDay.toISOString());
  return count || 0;
}

function validateVacancyForm(form: VacancyFormState, opts?: { requireDeadline?: boolean }): string | null {
  const errors = validateVacancyFormShared(form, opts);
  return errors ? Object.values(errors)[0]! : null;
}

export async function getEmployerPostingData() {
  const session = await requireEmployer();
  if (!session) throw new Error("Unauthorized");

  const supabase = getSupabase();
  const [jobsRes, templatesRes, rules, applicationsRes] = await Promise.all([
    supabase.from("jobs").select("*").eq("employer_id", session.employerId).order("last_posted_at", { ascending: false }),
    supabase.from("employer_vacancy_templates").select("*").eq("employer_id", session.employerId).order("created_at", { ascending: false }),
    getEmployerPublishingRules(supabase, session.employerId),
    supabase.from("applications").select("job_id, jobs!inner ( employer_id )").eq("jobs.employer_id", session.employerId),
  ]);

  // Per-job applicant counts, so each posting can show how many people applied
  // and link straight into the applicant tracking page for that job.
  const applicantCounts: Record<string, number> = {};
  for (const row of applicationsRes.data || []) {
    const jobId = (row as any).job_id as string;
    applicantCounts[jobId] = (applicantCounts[jobId] ?? 0) + 1;
  }

  return {
    jobs: jobsRes.data || [],
    templates: templatesRes.data || [],
    applicantCounts,
    autoPublish: rules.autoPublish,
    dailyPostLimit: rules.dailyPostLimit,
    businessName: session.businessName,
    businessType: session.businessType,
    logoUrl: session.logoUrl || null,
  };
}

/** "Post Now" on the Post tab — creates a new job directly for this employer. */
export async function createEmployerJob(form: VacancyFormState): Promise<{ success: true; status: "active" | "pending" } | { success: false; error: string }> {
  const session = await requireEmployer();
  if (!session) return { success: false, error: "Unauthorized" };

  const validationError = validateVacancyForm(form);
  if (validationError) return { success: false, error: validationError };

  const supabase = getSupabase();
  const rules = await getEmployerPublishingRules(supabase, session.employerId);

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
    deadline: form.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
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

  const validationError = validateVacancyForm(form);
  if (validationError) return { success: false, error: validationError };

  const supabase = getSupabase();
  const { data: existing } = await supabase.from("jobs").select("id, employer_id").eq("id", jobId).maybeSingle();
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
      deadline: form.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      quantity: form.quantity || 1,
    })
    .eq("id", jobId);

  if (error) return { success: false, error: error.message || "Failed to update job" };
  await logEmployerActivity(session, "employer_edit_job", form.title);
  return { success: true };
}

/** Repost button on an expired job card — requires a new (future) deadline,
 *  is gated by the same daily posting limit as a fresh post, and re-runs the
 *  employer's auto_publish routing (active if they have "post without
 *  review", otherwise back to pending for admin review). Updates the
 *  existing row in place rather than creating a new job. */
export async function repostEmployerJob(jobId: string, form: VacancyFormState): Promise<{ success: true; status: "active" | "pending" } | { success: false; error: string }> {
  const session = await requireEmployer();
  if (!session) return { success: false, error: "Unauthorized" };

  const validationError = validateVacancyForm(form, { requireDeadline: true });
  if (validationError) return { success: false, error: validationError };

  const supabase = getSupabase();
  const { data: existing } = await supabase.from("jobs").select("id, employer_id, status, deadline").eq("id", jobId).maybeSingle();
  if (!existing || existing.employer_id !== session.employerId) return { success: false, error: "Job not found" };
  if (existing.status !== "expired") return { success: false, error: "Only expired jobs can be reposted." };

  const rules = await getEmployerPublishingRules(supabase, session.employerId);
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
      deadline: form.deadline,
      quantity: form.quantity || 1,
      status: newStatus,
      // Stamp the repost time: makes this count toward today's post limit,
      // floats the job to the top of the feed, and shows it as freshly posted
      // to seekers — while created_at stays as the original post date.
      last_posted_at: new Date().toISOString(),
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

  const validationError = validateVacancyForm(payload);
  if (validationError) return { success: false, error: validationError };

  const supabase = getSupabase();
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
    experience_required: data.experience_required,
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
    deadline: tpl.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
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
    deadline: tpl.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    quantity: tpl.quantity || 1,
    status: "scheduled",
    scheduled_at: scheduledAt,
  });

  if (error) return { success: false, error: error.message || "Failed to schedule publication" };
  await logEmployerActivity(session, "employer_schedule_post", tpl.title, { scheduledAt });
  return { success: true };
}
