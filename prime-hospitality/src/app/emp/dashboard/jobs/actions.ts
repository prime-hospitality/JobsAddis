"use server";

import { createClient } from "@supabase/supabase-js";
import { getEmployerSession } from "../../actions";
import {
  VacancyFormState,
  buildJobDescription,
  buildRequirementsJson,
  resolveSalary,
} from "./vacancyShared";

const getSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key";
  return createClient(supabaseUrl, supabaseServiceKey);
};

async function requireEmployer() {
  const session = await getEmployerSession();
  if (!session?.employerId) return null;
  return session as { employerId: string; telegramId: number; businessName: string; businessType: string; logoUrl?: string | null };
}

/** Records an employer-originated action to the shared activity_log table, so
 *  the admin dashboard's "Employer Activity" panel has a real, actor-accurate
 *  trail instead of inferring activity from current `jobs` row state (which
 *  can't tell an employer's action from an admin's, loses the timestamp of
 *  any status change, and vanishes entirely on delete). Reuses the existing
 *  activity_log table (actor/action/target/metadata are all generic) — admin
 *  actions tag `actor` with the admin username; this tags it with the
 *  employer's business name and stamps metadata.source = "employer" so the
 *  two trails stay cleanly distinguishable in the same table. */
async function logEmployerActivity(
  session: { employerId: string; businessName: string },
  action: string,
  target?: string | null,
  metadata?: Record<string, any>
) {
  try {
    await getSupabase().from("activity_log").insert({
      actor: session.businessName,
      action,
      target: target || null,
      metadata: { ...metadata, source: "employer", employerId: session.employerId },
    });
  } catch (err) {
    console.error("Failed to write employer activity log:", err);
  }
}

async function getEmployerPublishingRules(supabase: ReturnType<typeof getSupabase>, employerId: string) {
  const { data } = await supabase
    .from("employers")
    .select("auto_publish, daily_post_limit")
    .eq("id", employerId)
    .single();
  return {
    autoPublish: !!data?.auto_publish,
    dailyPostLimit: data?.daily_post_limit ?? 3,
  };
}

async function getTodayPostCount(supabase: ReturnType<typeof getSupabase>, employerId: string) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("employer_id", employerId)
    .gte("created_at", startOfDay.toISOString());
  return count || 0;
}

function validateVacancyForm(form: VacancyFormState): string | null {
  if (!form.title?.trim()) return "Job Title is required.";
  if (!form.description_template?.trim()) return "Job Description is required.";
  return null;
}

export async function getEmployerPostingData() {
  const session = await requireEmployer();
  if (!session) throw new Error("Unauthorized");

  const supabase = getSupabase();
  const [jobsRes, templatesRes, rules] = await Promise.all([
    supabase.from("jobs").select("*").eq("employer_id", session.employerId).order("created_at", { ascending: false }),
    supabase.from("employer_vacancy_templates").select("*").eq("employer_id", session.employerId).order("created_at", { ascending: false }),
    getEmployerPublishingRules(supabase, session.employerId),
  ]);

  return {
    jobs: jobsRes.data || [],
    templates: templatesRes.data || [],
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
    currency: form.salary_currency || "ETB",
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
      currency: form.salary_currency || "ETB",
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
    salary_currency: data.salary_currency,
    salary_period: data.salary_period,
    experience_required: data.experience_required,
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
