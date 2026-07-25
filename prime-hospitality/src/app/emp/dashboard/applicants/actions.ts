"use server";

import { getSupabase, requireEmployer, logEmployerActivity } from "../shared/employerServerUtils";
import { resumeStoragePath, CV_SIGNED_URL_TTL_SECONDS } from "@/lib/cvStorage";

export type ApplicationStatus = "pending" | "reviewed" | "shortlisted" | "rejected";

const VALID_STATUSES: ApplicationStatus[] = ["pending", "reviewed", "shortlisted", "rejected"];

export interface ApplicantProfile {
  full_name: string | null;
  age: number | null;
  gender: string | null;
  location: string | null;
  willing_to_relocate: boolean | null;
  phone_number: string | null;
  secondary_phone: string | null;
  selected_categories: string[] | null;
  experience_levels: Record<string, string> | null;
  cv_url: string | null;
}

export interface ApplicantRow {
  id: string;
  job_id: string;
  job_title: string;
  status: ApplicationStatus;
  cover_note: string | null;
  created_at: string;
  profile: ApplicantProfile | null;
  /** 0-100 completeness of the seeker's profile — used to rank the list. */
  score: number;
}

/**
 * How complete this seeker's profile is, in 20-point steps. Ported from the
 * Telegram employer screen (src/screens/ApplicantManagementScreen.tsx) so both
 * surfaces rank applicants the same way.
 */
function profileScore(p: ApplicantProfile | null): number {
  if (!p) return 0;
  let score = 0;
  if (p.full_name && p.age && p.location) score += 20;
  if (p.phone_number) score += 20;
  if (p.selected_categories && p.selected_categories.length > 0) score += 20;
  if (
    p.selected_categories &&
    p.selected_categories.length > 0 &&
    p.selected_categories.every((c) => p.experience_levels?.[c])
  ) {
    score += 20;
  }
  if (p.cv_url) score += 20;
  return score;
}

/** Supabase types a to-one embed as an array in some paths; normalise it. */
function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

/**
 * Applicants for the signed-in employer's jobs, and nothing else. The
 * `jobs!inner` join plus the `jobs.employer_id` filter is what scopes this —
 * without it any employer could read any other employer's applicant list.
 *
 * Returns every status so the page can show tab counts; the status tabs and the
 * name search filter the returned list on the client.
 */
export async function getApplicants(jobId?: string): Promise<{
  applicants: ApplicantRow[];
  jobs: Array<{ id: string; title: string }>;
}> {
  const session = await requireEmployer();
  if (!session) throw new Error("Unauthorized");

  const supabase = getSupabase();

  let query = supabase
    .from("applications")
    .select(
      `id, job_id, status, cover_note, created_at,
       jobs!inner ( id, title, employer_id ),
       profiles ( full_name, age, gender, location, willing_to_relocate, phone_number, secondary_phone, selected_categories, experience_levels, cv_url )`
    )
    .eq("jobs.employer_id", session.employerId)
    .order("created_at", { ascending: false });

  if (jobId) query = query.eq("job_id", jobId);

  const [appsRes, jobsRes] = await Promise.all([
    query,
    supabase
      .from("jobs")
      .select("id, title")
      .eq("employer_id", session.employerId)
      .order("created_at", { ascending: false }),
  ]);

  if (appsRes.error) throw appsRes.error;

  const applicants: ApplicantRow[] = (appsRes.data ?? [])
    .map((row: any) => {
      const profile = one<ApplicantProfile>(row.profiles);
      return {
        id: row.id as string,
        job_id: row.job_id as string,
        job_title: (one<{ title: string }>(row.jobs)?.title ?? "") as string,
        status: row.status as ApplicationStatus,
        cover_note: row.cover_note as string | null,
        created_at: row.created_at as string,
        profile,
        score: profileScore(profile),
      };
    })
    // Most complete profiles first, then longest-waiting.
    .sort((a, b) => b.score - a.score || +new Date(a.created_at) - +new Date(b.created_at));

  return { applicants, jobs: jobsRes.data ?? [] };
}

/** Loads an application only if it belongs to one of this employer's jobs. */
async function loadOwnedApplication(
  supabase: ReturnType<typeof getSupabase>,
  employerId: string,
  applicationId: string
) {
  const { data } = await supabase
    .from("applications")
    .select(`id, telegram_id, job_id, status, jobs!inner ( id, title, employer_id ), profiles ( cv_url )`)
    .eq("id", applicationId)
    .single();

  if (!data) return null;
  const job = one<{ id: string; title: string; employer_id: string }>((data as any).jobs);
  if (!job || job.employer_id !== employerId) return null;

  return {
    id: data.id as string,
    telegramId: (data as any).telegram_id as number,
    status: (data as any).status as ApplicationStatus,
    job,
    cvUrl: one<{ cv_url: string | null }>((data as any).profiles)?.cv_url ?? null,
  };
}

export async function setApplicationStatus(
  applicationId: string,
  status: ApplicationStatus
): Promise<{ success: boolean; error?: string }> {
  const session = await requireEmployer();
  if (!session) return { success: false, error: "Unauthorized" };
  if (!VALID_STATUSES.includes(status)) return { success: false, error: "Invalid status." };

  const supabase = getSupabase();
  const app = await loadOwnedApplication(supabase, session.employerId, applicationId);
  if (!app) return { success: false, error: "Applicant not found." };
  if (app.status === status) return { success: true };

  const { error } = await supabase
    .from("applications")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", applicationId);

  if (error) return { success: false, error: error.message };

  // Seekers are told when they're shortlisted — good news only. Declines are
  // deliberately silent; they see the status in My Applications if they look.
  if (status === "shortlisted") {
    try {
      await supabase.from("notifications").insert({
        user_telegram_id: app.telegramId,
        company_name: session.businessName,
        job_title: app.job.title,
        type: "shortlisted",
        job_id: app.job.id,
        read: false,
      });
    } catch (err) {
      console.error("Failed to notify shortlisted applicant:", err);
    }
  }

  // "reviewed" is set automatically when a card is opened, so logging it would
  // bury the decisions the employer actually made.
  if (status !== "reviewed") {
    await logEmployerActivity(session, `applicant_${status}`, app.job.title, { applicationId });
  }

  return { success: true };
}

/** Marks a still-untouched applicant as reviewed when the employer opens them. */
export async function markApplicantReviewed(applicationId: string): Promise<{ success: boolean }> {
  const session = await requireEmployer();
  if (!session) return { success: false };

  const supabase = getSupabase();
  const app = await loadOwnedApplication(supabase, session.employerId, applicationId);
  if (!app || app.status !== "pending") return { success: false };

  await supabase
    .from("applications")
    .update({ status: "reviewed", updated_at: new Date().toISOString() })
    .eq("id", applicationId);

  return { success: true };
}

/**
 * A short-lived link to this applicant's CV. The resumes bucket is private, so
 * the file is only reachable through a signed URL minted here — after we've
 * confirmed the applicant actually applied to one of this employer's jobs.
 */
export async function getCvSignedUrl(
  applicationId: string
): Promise<{ url: string } | { error: string }> {
  const session = await requireEmployer();
  if (!session) return { error: "Unauthorized" };

  const supabase = getSupabase();
  const app = await loadOwnedApplication(supabase, session.employerId, applicationId);
  if (!app) return { error: "Applicant not found." };

  const path = resumeStoragePath(app.cvUrl);
  if (!path) return { error: "This applicant hasn't uploaded a CV." };

  const { data, error } = await supabase.storage
    .from("resumes")
    .createSignedUrl(path, CV_SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) return { error: "Could not open this CV. Please try again." };
  return { url: data.signedUrl };
}

/** Per-job applicant counts for the Jobs tab and the sidebar badge. */
export async function getApplicantCounts(): Promise<{
  byJob: Record<string, number>;
  newCount: number;
}> {
  const session = await requireEmployer();
  if (!session) return { byJob: {}, newCount: 0 };

  const supabase = getSupabase();
  const { data } = await supabase
    .from("applications")
    .select("job_id, status, jobs!inner ( employer_id )")
    .eq("jobs.employer_id", session.employerId);

  const byJob: Record<string, number> = {};
  let newCount = 0;
  for (const row of data ?? []) {
    const jobId = (row as any).job_id as string;
    byJob[jobId] = (byJob[jobId] ?? 0) + 1;
    if ((row as any).status === "pending") newCount++;
  }

  return { byJob, newCount };
}
