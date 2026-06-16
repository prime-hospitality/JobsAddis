/**
 * api.ts — Secure API layer for Prime Hospitality
 *
 * ALL mutating requests (application submission, profile creation, job posting)
 * MUST go through this module. It automatically attaches the raw Telegram
 * initData as the `x-telegram-init-data` header, which the Edge Function
 * validates via HMAC-SHA256 before processing any action.
 *
 * Never call Supabase client-side for writes — always use these functions.
 */

const SUPABASE_BASE = (process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co").replace("/rest/v1", "");
const EDGE_FUNCTION_URL = `${SUPABASE_BASE}/functions/v1/validate-telegram-auth`;
const SHORTLIST_FUNCTION_URL = `${SUPABASE_BASE}/functions/v1/shortlist-applicant`;


// ---------------------------------------------------------------------------
// Internal request helper
// ---------------------------------------------------------------------------
async function callEdgeFunction<T = unknown>(
  initData: string | null,
  body: Record<string, unknown>
): Promise<T> {
  if (!initData) {
    // In development (outside Telegram) there is no real initData.
    // We still make the call but the Edge Function will reject non-dev requests.
    console.warn(
      "[api] No initData available. This request will fail in production."
    );
  }

  const res = await fetch(EDGE_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Supabase Edge Functions require the anon key in the Authorization header
      // to pass through the API gateway, even though our custom logic validates
      // the x-telegram-init-data header.
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""}`,
      // This header is the security gate for our custom Telegram validation
      "x-telegram-init-data": initData ?? "",
    },
    body: JSON.stringify(body),
  });

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new Error("Server returned an invalid response.");
  }

  if (!res.ok) {
    const errData = data as { error?: string; message?: string };
    const errorMsg =
      errData?.error ||
      errData?.message ||
      `Unknown error (${res.status}): ${JSON.stringify(data).substring(0, 100)}`;
    throw new ApiError(errorMsg, res.status);
  }

  return data as T;
}

// ---------------------------------------------------------------------------
// Custom error class for structured error handling in the UI
// ---------------------------------------------------------------------------
export class ApiError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
    this.name = "ApiError";
  }

  /** Returns true if the error is a rate-limit response (429) */
  get isRateLimit() {
    return this.statusCode === 429;
  }

  /** Returns true if the auth signature was rejected (401) */
  get isUnauthorized() {
    return this.statusCode === 401;
  }

  /** Returns true if this was a duplicate submission (409) */
  get isDuplicate() {
    return this.statusCode === 409;
  }
}

// ---------------------------------------------------------------------------
// Action: Submit a job application
// ---------------------------------------------------------------------------
export interface SubmitApplicationParams {
  initData: string | null;
  jobId: string;
  coverNote?: string;
}

export async function submitApplication({
  initData,
  jobId,
  coverNote,
}: SubmitApplicationParams): Promise<{ success: boolean; message: string }> {
  return callEdgeFunction(initData, {
    action: "submit_application",
    jobId,
    coverNote: coverNote ?? "",
  });
}

// ---------------------------------------------------------------------------
// Action: Create job seeker profile (onboarding completion)
// ---------------------------------------------------------------------------
export interface CreateProfileParams {
  initData: string | null;
  profileData: {
    fullName: string;
    age: number | "";
    location: string;
    willingToRelocate: boolean;
    gender: string;
    contactShared: boolean | null;
    phoneNumber: string;
    selectedCategories: string[];
    experienceLevels: Record<string, string>;
  };
  cvUrl: string | null;
}

export async function createProfile({
  initData,
  profileData,
  cvUrl,
}: CreateProfileParams): Promise<{ success: boolean; message: string }> {
  return callEdgeFunction(initData, {
    action: "create_profile",
    profileData,
    cvUrl,
  });
}

// ---------------------------------------------------------------------------
// Action: Update CV URL
// ---------------------------------------------------------------------------
export interface UpdateCvParams {
  initData: string | null;
  cvUrl: string | null;
}

export async function updateCv({
  initData,
  cvUrl,
}: UpdateCvParams): Promise<{ success: boolean; message: string }> {
  return callEdgeFunction(initData, {
    action: "update_cv",
    cvUrl,
  });
}

// ---------------------------------------------------------------------------
// Action: Update primary phone number
// ---------------------------------------------------------------------------
export async function updatePhone(
  initData: string | null,
  phoneNumber: string | null
): Promise<{ success: boolean; message: string }> {
  return callEdgeFunction(initData, {
    action: "update_phone",
    phoneNumber,
  });
}

// ---------------------------------------------------------------------------
// Action: Update secondary phone number
// ---------------------------------------------------------------------------
export async function updateSecondaryPhone(
  initData: string | null,
  secondaryPhone: string | null
): Promise<{ success: boolean; message: string }> {
  return callEdgeFunction(initData, {
    action: "update_secondary_phone",
    secondaryPhone,
  });
}

// ---------------------------------------------------------------------------
// Action: Update employer logo
// ---------------------------------------------------------------------------
export async function updateEmployerLogo(
  initData: string | null,
  logoUrl: string | null
): Promise<{ success: boolean; message: string }> {
  return callEdgeFunction(initData, {
    action: "update_employer_logo",
    logoUrl,
  });
}

// ---------------------------------------------------------------------------
// Action: Fetch job seeker profile (profile tab + onboarding check)
// ---------------------------------------------------------------------------
export interface FetchProfileResult {
  success: boolean;
  profile: Record<string, unknown> | null;
  onboarding_completed: boolean;
  is_employer?: boolean;
}

export async function fetchProfile(
  initData: string | null
): Promise<FetchProfileResult> {
  return callEdgeFunction<FetchProfileResult>(initData, {
    action: "get_profile",
  });
}

// ---------------------------------------------------------------------------
// Action: Fetch job seeker applications list
// ---------------------------------------------------------------------------
export interface FetchApplicationsResult {
  success: boolean;
  applications: Array<Record<string, any>>;
}

export async function fetchApplications(
  initData: string | null
): Promise<FetchApplicationsResult> {
  return callEdgeFunction<FetchApplicationsResult>(initData, {
    action: "get_applications",
  });
}

// ---------------------------------------------------------------------------
// Action: Fetch employer dashboard data
// ---------------------------------------------------------------------------
export interface FetchEmployerDashboardResult {
  success: boolean;
  employer: {
    id: string;
    business_name: string;
    status: "pending" | "approved" | "rejected";
    daily_post_limit?: number;
    today_post_count?: number;
    logo_url?: string | null;
  };
  jobs: Array<Record<string, any>>;
  stats: {
    totalJobs: number;
    activeJobs: number;
    totalApplicants: number;
    pendingReview: number;
  };
}

export async function fetchEmployerDashboard(
  initData: string | null
): Promise<FetchEmployerDashboardResult> {
  return callEdgeFunction<FetchEmployerDashboardResult>(initData, {
    action: "get_employer_dashboard",
  });
}

// ---------------------------------------------------------------------------
// Action: Post a new job listing
// ---------------------------------------------------------------------------
export interface PostJobParams {
  initData: string | null;
  jobData: {
    title: string;
    category: string;
    jobType: string;
    salaryMin: string;
    salaryMax: string;
    neighborhood: string;
    description: string;
    deadline: string;
    experience: string;
    education: string;
    workingHours?: string;
    quantity?: string;
  };
}

export async function postJob({
  initData,
  jobData,
}: PostJobParams): Promise<{ success: boolean; message: string }> {
  return callEdgeFunction(initData, {
    action: "post_job",
    jobData,
  });
}

// ---------------------------------------------------------------------------
// Action: Edit an existing job listing
// ---------------------------------------------------------------------------
export interface EditJobParams {
  initData: string | null;
  jobId: string;
  jobData: {
    title: string;
    category: string;
    jobType: string;
    salaryMin: string;
    salaryMax: string;
    neighborhood: string;
    description: string;
    deadline: string;
    experience: string;
    education: string;
    workingHours?: string;
    quantity?: string;
  };
}

export async function editJob({
  initData,
  jobId,
  jobData,
}: EditJobParams): Promise<{ success: boolean; message: string }> {
  return callEdgeFunction(initData, {
    action: "edit_job",
    jobId,
    jobData,
  });
}

// ---------------------------------------------------------------------------
// Action: Delete a job listing
// ---------------------------------------------------------------------------
export interface DeleteJobParams {
  initData: string | null;
  jobId: string;
}

export async function deleteJob({
  initData,
  jobId,
}: DeleteJobParams): Promise<{ success: boolean; message: string }> {
  return callEdgeFunction(initData, {
    action: "delete_job",
    jobId,
  });
}

// ---------------------------------------------------------------------------
// Action: Fetch applicants for a specific job (employer only)
// ---------------------------------------------------------------------------
export async function fetchJobApplicants(
  initData: string | null,
  jobId: string
): Promise<{ success: boolean; applicants: Array<Record<string, any>> }> {
  return callEdgeFunction(initData, { action: "get_job_applicants", jobId });
}

// ---------------------------------------------------------------------------
// Action: Shortlist an applicant — calls dedicated shortlist-applicant function
// ---------------------------------------------------------------------------
export async function shortlistApplicant(
  initData: string | null,
  applicationId: string
): Promise<{ success: boolean }> {
  if (!initData) throw new Error("No auth");
  const res = await fetch(SHORTLIST_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""}`,
      "x-telegram-init-data": initData,
    },
    body: JSON.stringify({ action: "shortlist", applicationId }),
  });
  const data = await res.json();
  if (!res.ok) throw new ApiError(data?.error || "Shortlist failed", res.status);
  return data;
}

// ---------------------------------------------------------------------------
// Action: Decline an applicant
// ---------------------------------------------------------------------------
export async function declineApplicant(
  initData: string | null,
  applicationId: string
): Promise<{ success: boolean }> {
  if (!initData) throw new Error("No auth");
  const res = await fetch(SHORTLIST_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""}`,
      "x-telegram-init-data": initData,
    },
    body: JSON.stringify({ action: "decline", applicationId }),
  });
  const data = await res.json();
  if (!res.ok) throw new ApiError(data?.error || "Decline failed", res.status);
  return data;
}

// ---------------------------------------------------------------------------
// Action: Un-shortlist an applicant
// ---------------------------------------------------------------------------
export async function unshortlistApplicant(
  initData: string | null,
  applicationId: string
): Promise<{ success: boolean }> {
  if (!initData) throw new Error("No auth");
  const res = await fetch(SHORTLIST_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""}`,
      "x-telegram-init-data": initData,
    },
    body: JSON.stringify({ action: "unshortlist", applicationId }),
  });
  const data = await res.json();
  if (!res.ok) throw new ApiError(data?.error || "Unshortlist failed", res.status);
  return data;
}

// ---------------------------------------------------------------------------
// Action: Fetch notifications for the current job seeker
// ---------------------------------------------------------------------------
export interface Notification {
  id: string;
  user_telegram_id: number;
  company_name: string;
  job_title: string;
  type: "shortlisted" | "rejected" | "message" | "vacancy_alert";
  read: boolean;
  created_at: string;
  job_id?: string;
}

export async function fetchNotifications(
  initData: string | null
): Promise<{ success: boolean; notifications: Notification[] }> {
  return callEdgeFunction(initData, { action: "get_notifications" });
}

// ---------------------------------------------------------------------------
// Action: Mark all notifications as read
// ---------------------------------------------------------------------------
export async function markNotificationsRead(
  initData: string | null
): Promise<{ success: boolean }> {
  return callEdgeFunction(initData, { action: "mark_notifications_read" });
}

// ---------------------------------------------------------------------------
// Action: Get unread notification count
// ---------------------------------------------------------------------------
export async function getUnreadCount(
  initData: string | null
): Promise<{ success: boolean; unread_count: number }> {
  return callEdgeFunction(initData, { action: "get_unread_count" });
}

// ---------------------------------------------------------------------------
// Action: Update alert categories for vacancy subscriptions
// ---------------------------------------------------------------------------
export async function updateAlertCategories(
  initData: string | null,
  categories: string[]
): Promise<{ success: boolean; message: string }> {
  return callEdgeFunction(initData, {
    action: "update_alert_categories",
    categories,
  });
}
