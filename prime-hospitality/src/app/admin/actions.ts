"use server";

import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { ADMIN_UI_COOKIE } from "@/lib/adminUiCookie";
import { resumeStoragePath } from "@/lib/cvStorage";
import { verifyConfigPassword } from "@/lib/appConfigPassword";
import { signSessionValue, verifySessionValue } from "@/lib/signedSession";
import { startOfAddisDay } from "@/lib/addisDay";
import { isSubscriptionExpired } from "@/lib/subscriptionStatus";
import { normalizeTin, validateTin, isDuplicateTin, TIN_TAKEN_ERROR } from "@/lib/ethiopianTin";
import {
  VacancyFormState,
  validateVacancyForm,
  buildJobDescription,
  buildRequirementsJson,
  coerceGender,
  coerceYears,
  resolveSalary,
} from "@/app/emp/dashboard/jobs/vacancyShared";

const ADMIN_PASSWORD_FALLBACK = process.env.ADMIN_PASSWORD || "admin123";

const getSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key";
  return createClient(supabaseUrl, supabaseServiceKey);
};

const ADMIN_MAX_LOGIN_ATTEMPTS = 5;
const ADMIN_LOCKOUT_MINUTES = 15;

// ── Permission Types ────────────────────────────────────────────────────────
export type AdminPermissions = {
  manageEmployers: boolean;
  manageJobs: boolean;
  manageUsers: boolean;
  manageConfiguration: boolean;
  manageReports: boolean;
};

export type SubAdmin = {
  id: string;
  username: string;
  password: string;
  permissions: AdminPermissions;
  createdAt: string;
};

// ── Sub-admin helpers ────────────────────────────────────────────────────────
async function getSubAdmins(): Promise<SubAdmin[]> {
  const supabase = getSupabase();
  const { data } = await supabase.from("app_config").select("value").eq("key", "sub_admins").maybeSingle();
  try { return data?.value ? JSON.parse(data.value) : []; } catch { return []; }
}

async function saveSubAdmins(admins: SubAdmin[]): Promise<void> {
  await getSupabase().from("app_config").upsert({ key: "sub_admins", value: JSON.stringify(admins), updated_at: new Date().toISOString() }, { onConflict: "key" });
}

// Sub-admin passwords live inside the sub_admins JSON blob rather than one
// app_config row each, so they can't reuse verifyConfigPassword directly.
// Same idea though: bcrypt going forward, with older plaintext rows
// upgraded to a hash the moment they successfully match.
async function matchAndMaybeUpgradeSubAdminPassword(allSubs: SubAdmin[], record: SubAdmin, passwordAttempt: string): Promise<boolean> {
  const looksHashed = /^\$2[aby]\$/.test(record.password);
  if (looksHashed) return bcrypt.compare(passwordAttempt, record.password);
  if (passwordAttempt !== record.password) return false;
  const upgraded = await bcrypt.hash(passwordAttempt, 10);
  await saveSubAdmins(allSubs.map((s) => (s.id === record.id ? { ...s, password: upgraded } : s)));
  return true;
}

// ── Session helpers ─────────────────────────────────────────────────────────
async function getSession() {
  const cookie = (await cookies()).get("admin_session");
  return verifySessionValue(cookie?.value);
}

export async function getLoggedInAdmin(): Promise<{ username: string; role: "super_admin" | "sub_admin"; permissions: AdminPermissions } | null> {
  const session = await getSession();
  if (!session) return null;
  if (session.role === "super_admin") {
    return { username: session.username, role: "super_admin", permissions: { manageEmployers: true, manageJobs: true, manageUsers: true, manageConfiguration: true, manageReports: true } };
  }
  // Sub-admin: load permissions from DB
  const subs = await getSubAdmins();
  const found = subs.find((s) => s.username === session.username);
  if (!found) return null;
  return { username: found.username, role: "sub_admin", permissions: found.permissions };
}

async function requirePermission(perm: keyof AdminPermissions) {
  const admin = await getLoggedInAdmin();
  if (!admin) throw new Error("Unauthorized");
  if (!admin.permissions[perm]) throw new Error("Permission denied");
}

async function logActivity(action: string, target?: string, metadata?: Record<string, any>) {
  try {
    const admin = await getLoggedInAdmin();
    await getSupabase().from("activity_log").insert({
      actor: admin?.username || "system",
      action,
      target: target || null,
      metadata: metadata || null,
    });
  } catch (err) {
    console.error("Failed to write activity log:", err);
  }
}

export async function loginAdmin(username: string, password: string) {
  const supabase = getSupabase();
  const attemptKey = username.trim().toLowerCase();

  // Keyed by the attempted username (not IP -- there's no reliable client IP
  // in this environment) so brute-forcing one account's password can't lock
  // out a different admin. See clearAdminLoginLockout in idp/actions.ts for
  // the self-service unlock if a real admin trips this on themselves.
  const { data: attemptRow } = await supabase
    .from("admin_login_attempts")
    .select("failed_attempts, locked_until")
    .eq("username", attemptKey)
    .maybeSingle();

  if (attemptRow?.locked_until && new Date(attemptRow.locked_until) > new Date()) {
    const minutesLeft = Math.ceil((new Date(attemptRow.locked_until).getTime() - Date.now()) / 60000);
    return { success: false, error: `Too many failed attempts. Please try again in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.` };
  }

  // Check super admin first
  const { data: uCfg } = await supabase.from("app_config").select("value").eq("key", "admin_username").single();
  const storedUsername = uCfg?.value?.trim() || "admin";

  if (username.toLowerCase() === storedUsername.toLowerCase() && await verifyConfigPassword("admin_password", password, ADMIN_PASSWORD_FALLBACK)) {
    if (attemptRow) await supabase.from("admin_login_attempts").delete().eq("username", attemptKey);
    const sessionData = signSessionValue({ username: storedUsername, role: "super_admin" });
    const jar = await cookies();
    jar.set("admin_session", sessionData, { maxAge: 60 * 60 * 24, httpOnly: true, secure: process.env.NODE_ENV === "production" });
    // Always start a fresh login on the Overview tab — don't inherit the
    // previous user's saved position (this is a shared computer).
    jar.delete(ADMIN_UI_COOKIE);
    return { success: true, role: "super_admin", username: storedUsername };
  }

  // Check sub-admins. Older rows may still hold a plaintext password --
  // upgrade to a hash the moment one of those matches.
  const subs = await getSubAdmins();
  const subRecord = subs.find((s) => s.username.toLowerCase() === username.toLowerCase());
  const subMatched = subRecord ? await matchAndMaybeUpgradeSubAdminPassword(subs, subRecord, password) : false;
  if (subRecord && subMatched) {
    if (attemptRow) await supabase.from("admin_login_attempts").delete().eq("username", attemptKey);
    const sessionData = signSessionValue({ username: subRecord.username, role: "sub_admin" });
    const jar = await cookies();
    jar.set("admin_session", sessionData, { maxAge: 60 * 60 * 24, httpOnly: true, secure: process.env.NODE_ENV === "production" });
    // Always start a fresh login on the Overview tab (shared computer).
    jar.delete(ADMIN_UI_COOKIE);
    return { success: true, role: "sub_admin", username: subRecord.username };
  }

  const nextAttempts = (attemptRow?.failed_attempts ?? 0) + 1;
  if (nextAttempts >= ADMIN_MAX_LOGIN_ATTEMPTS) {
    const lockedUntil = new Date(Date.now() + ADMIN_LOCKOUT_MINUTES * 60000).toISOString();
    await supabase.from("admin_login_attempts").upsert({ username: attemptKey, failed_attempts: 0, locked_until: lockedUntil });
    return { success: false, error: `Too many failed attempts. Please try again in ${ADMIN_LOCKOUT_MINUTES} minutes.` };
  }
  await supabase.from("admin_login_attempts").upsert({ username: attemptKey, failed_attempts: nextAttempts, locked_until: null });
  return { success: false, error: "Invalid username or password" };
}

// Lightweight check of who the shared session cookie currently belongs to.
// Used by a tab to detect if the browser's session was taken over by a
// different admin (e.g. a sub-admin logged in on another tab).
export async function getCurrentAdminUsername(): Promise<string | null> {
  const session = await getSession();
  return session?.username ?? null;
}

// ── Sub-Admin Management ─────────────────────────────────────────────────────
export async function createSubAdmin(username: string, password: string) {
  const session = await getSession();
  if (!session || session.role !== "super_admin") return { success: false, error: "Only the super admin can create sub-admins" };
  if (!username.trim() || !password.trim()) return { success: false, error: "Username and password are required" };

  const subs = await getSubAdmins();
  if (subs.some((s) => s.username.toLowerCase() === username.toLowerCase())) {
    return { success: false, error: "An admin with that username already exists" };
  }

  const newSub: SubAdmin = {
    id: Date.now().toString(),
    username: username.trim(),
    password: await bcrypt.hash(password.trim(), 10),
    permissions: { manageEmployers: false, manageJobs: false, manageUsers: false, manageConfiguration: false, manageReports: false },
    createdAt: new Date().toISOString(),
  };

  await saveSubAdmins([...subs, newSub]);
  await logActivity("create_sub_admin", newSub.username);
  return { success: true, subAdmin: newSub };
}

export async function updateSubAdminPermissions(id: string, permissions: AdminPermissions) {
  const session = await getSession();
  if (!session || session.role !== "super_admin") return { success: false, error: "Only the super admin can update permissions" };

  const subs = await getSubAdmins();
  const updated = subs.map((s) => s.id === id ? { ...s, permissions } : s);
  await saveSubAdmins(updated);
  const target = subs.find((s) => s.id === id);
  await logActivity("update_sub_admin_permissions", target?.username || id, { permissions });
  return { success: true };
}

export async function deleteSubAdmin(id: string, passwordAttempt: string) {
  const session = await getSession();
  if (!session || session.role !== "super_admin") return { success: false, error: "Only the super admin can delete sub-admins" };

  if (!(await verifyConfigPassword("admin_password", passwordAttempt, ADMIN_PASSWORD_FALLBACK))) {
    return { success: false, error: "Incorrect admin password" };
  }

  const subs = await getSubAdmins();
  await saveSubAdmins(subs.filter((s) => s.id !== id));
  return { success: true };
}

export async function listSubAdmins() {
  const session = await getSession();
  if (!session || session.role !== "super_admin") return { success: false, error: "Unauthorized", data: [] };
  const subs = await getSubAdmins();
  return { success: true, data: subs.map((s) => ({ ...s, password: "***" })) };
}

export async function logoutAdmin() {
  const jar = await cookies();
  jar.delete("admin_session");
  jar.delete(ADMIN_UI_COOKIE);
}

export async function getAdminData() {
  // Verify auth and get logged in admin profile
  const admin = await getLoggedInAdmin();
  if (!admin) throw new Error("Unauthorized");

  // Fetch all employers (exclude system/admin employers)
  const { data: rawEmployers } = await getSupabase()
    .from("employers")
    .select("*, users(telegram_id, role)")
    .order("created_at", { ascending: false });
  const employers = (rawEmployers || []).filter((e: any) => e.users?.role !== "admin");

  // Fetch all jobs
  const { data: jobs } = await getSupabase()
    .from("jobs")
    .select("*, employers(business_name)")
    .order("created_at", { ascending: false });

  // Fetch employer-originated activity (written by employer server actions,
  // tagged metadata.source = "employer") for the Overview "Employer Activity"
  // panel -- a real actor/time-accurate trail, not inferred from jobs rows.
  const { data: employerActivityLog } = await getSupabase()
    .from("activity_log")
    .select("*")
    .contains("metadata", { source: "employer" })
    .order("created_at", { ascending: false })
    .limit(200);

  // Fetch total job seekers count for overview stats
  const { count: userCount } = await getSupabase()
    .from("users")
    .select("*", { count: 'exact', head: true })
    .eq("role", "job_seeker");

  const supabase = getSupabase();
  const { data: uCfg } = await supabase.from("app_config").select("value").eq("key", "admin_username").single();
  const adminUsername = uCfg?.value?.trim() || "admin";

  // Fetch special requests from app_config
  const { data: srCfg } = await supabase.from("app_config").select("value").eq("key", "special_requests").maybeSingle();
  let specialRequests = [];
  try {
    if (srCfg?.value) {
      specialRequests = JSON.parse(srCfg.value);
      // Fetch names for these users since we no longer send the full users array
      if (specialRequests.length > 0) {
        const userIds = specialRequests.map((r: any) => r.userId);
        const { data: reqUsers } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
        if (reqUsers) {
          specialRequests = specialRequests.map((req: any) => {
            const match = reqUsers.find(u => u.id === req.userId);
            return { ...req, name: match?.full_name || "Unknown Name" };
          });
        }
      }
    }
  } catch (e) {}
  
  // Fetch pricing config
  const pricingConfig = await getPricingConfig();
  
  // Fetch sub-admins if super admin
  let subAdmins: any[] = [];
  if (admin.role === "super_admin") {
    const subsRes = await listSubAdmins();
    if (subsRes.success) {
      subAdmins = subsRes.data || [];
    }
  }

  return {
    employers: employers ?? [],
    jobs: jobs ?? [],
    employerActivityLog: employerActivityLog ?? [],
    userCount: userCount ?? 0,
    adminUsername,
    specialRequests,
    loggedInAdmin: admin,
    pricingConfig: pricingConfig || null,
    subAdmins
  };
}

export async function searchUsers(queryName: string, queryPhone: string, page: number = 1, pageSize: number = 25) {
  const admin = await getLoggedInAdmin();
  if (!admin) throw new Error("Unauthorized");

  let query = getSupabase()
    .from("users")
    .select("*, profiles!inner(full_name, phone_number)", { count: "exact" })
    .eq("role", "job_seeker");

  if (queryName) {
    query = query.ilike("profiles.full_name", `%${queryName}%`);
  }
  if (queryPhone) {
    query = query.ilike("profiles.phone_number", `%${queryPhone}%`);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);

  return {
    users: data || [],
    total: count || 0,
    page,
    pageSize
  };
}

export async function searchEmployers(queryBusinessName: string = "", page: number = 1, pageSize: number = 20) {
  const admin = await getLoggedInAdmin();
  if (!admin) throw new Error("Unauthorized");

  let query = getSupabase()
    .from("employers")
    // `!inner` + the role filter below exclude admin-linked employers at the DB
    // level so `count` matches the rows we return (post-query JS filtering would
    // leave the total inflated and let pagination page past the real data).
    .select("*, users!inner(telegram_id, role)", { count: "exact" })
    .neq("users.role", "admin");

  const q = (queryBusinessName || "").trim();
  if (q) {
    // A purely numeric search is treated as a Telegram ID lookup (the ID column
    // is shown in the table); anything else matches the business name.
    if (/^\d+$/.test(q)) {
      query = query.eq("users.telegram_id", q);
    } else {
      query = query.ilike("business_name", `%${q}%`);
    }
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);

  const employers = data || [];

  // Active job counts are fetched separately (only for the current page of
  // employers) since a filtered embedded count would turn this into an inner
  // join and drop employers with zero active jobs.
  const employerIds = employers.map((e: any) => e.id);
  const activeJobCounts: Record<string, number> = {};
  if (employerIds.length > 0) {
    const { data: activeJobRows } = await getSupabase()
      .from("jobs")
      .select("employer_id")
      .eq("status", "active")
      .in("employer_id", employerIds);
    for (const row of activeJobRows || []) {
      activeJobCounts[row.employer_id] = (activeJobCounts[row.employer_id] || 0) + 1;
    }
  }

  return {
    employers: employers.map((e: any) => ({ ...e, activeJobCount: activeJobCounts[e.id] || 0 })),
    total: count || 0,
    page,
    pageSize
  };
}

export async function adminUpdateEmployerLogo(employerId: string, logoUrl: string) {
  await requirePermission("manageEmployers");

  const { error } = await getSupabase().from("employers").update({ logo_url: logoUrl }).eq("id", employerId);
  if (error) throw error;
  return { success: true };
}

export async function toggleUserBan(userId: string, isBanned: boolean, passwordAttempt: string) {
  const admin = await getLoggedInAdmin();
  if (!admin) return { success: false, error: "Unauthorized" };
  if (!admin.permissions.manageUsers) return { success: false, error: "Permission denied" };

  // Only verify password for super admin; sub-admins with permission can act directly
  if (admin.role === "super_admin" && !(await verifyConfigPassword("admin_password", passwordAttempt, ADMIN_PASSWORD_FALLBACK))) {
    return { success: false, error: "Incorrect admin password" };
  }

  const { error } = await getSupabase().from("users").update({ is_banned: isBanned }).eq("id", userId);
  if (error) return { success: false, error: "Failed to update ban status" };
  await logActivity(isBanned ? "ban_user" : "unban_user", userId);
  return { success: true };
}

export async function deleteUser(userId: string, passwordAttempt: string) {
  const admin = await getLoggedInAdmin();
  if (!admin) return { success: false, error: "Unauthorized" };
  if (!admin.permissions.manageUsers) return { success: false, error: "Permission denied" };

  const supabase = getSupabase();
  if (!(await verifyConfigPassword("admin_password", passwordAttempt, ADMIN_PASSWORD_FALLBACK))) {
    return { success: false, error: "Incorrect admin password" };
  }

  // 1. Fetch user's profile to get the CV URL before deletion
  const { data: profile } = await supabase
    .from("profiles")
    .select("cv_url")
    .eq("user_id", userId)
    .single();

  // 1b. Fetch employer to get the logo URL if this user is an employer
  const { data: employer } = await supabase
    .from("employers")
    .select("logo_url")
    .eq("user_id", userId)
    .maybeSingle();

  // 2. Delete the user (this cascades to profiles, applications, employers, jobs)
  const { error } = await supabase.from("users").delete().eq("id", userId);
  if (error) return { success: false, error: "Failed to delete user" };
  await logActivity("delete_user", userId);

  // 3. Delete CV from storage if it exists
  const cvPath = resumeStoragePath(profile?.cv_url);
  if (cvPath) {
    await supabase.storage.from("resumes").remove([cvPath]);
  }

  // 4. Delete logo from storage if it exists
  if (employer?.logo_url) {
    const parts = employer.logo_url.split("/logos/");
    if (parts.length === 2) {
      const path = parts[1];
      await supabase.storage.from("logos").remove([path]);
    }
  }

  return { success: true };
}

/** An admin status change supersedes whatever the employer had marked, so the
 *  "filled" stamp is cleared alongside it. That matters in both directions:
 *  an admin closing a previously-filled job must not leave behind the flag the
 *  employer's Repost button unlocks on, and an admin reopening one must not
 *  leave it looking filled while it is live. */
export async function toggleJobStatus(jobId: string, status: "active" | "closed" | "pending" | "scheduled" | "rejected") {
  await requirePermission("manageJobs");

  const { error } = await getSupabase().from("jobs").update({ status, filled_at: null }).eq("id", jobId);
  if (error) throw error;
  await logActivity("change_job_status", jobId, { status });
  return { success: true };
}

/** Repost a closed/expired job -- updates the existing row in place (new
 *  deadline, status back to 'active') rather than inserting a duplicate row,
 *  so the job never leaves a stale ghost entry with its own action buttons
 *  behind in the Jobs by Employer list. */
export async function repostJob(jobId: string, newDeadline: string) {
  await requirePermission("manageJobs");

  const supabase = getSupabase();
  const { data: existing, error: fetchError } = await supabase
    .from("jobs")
    .select("id, status")
    .eq("id", jobId)
    .single();

  if (fetchError || !existing) throw fetchError || new Error("Job not found");
  if (existing.status !== "closed" && existing.status !== "expired") {
    throw new Error("Only closed or expired jobs can be reposted.");
  }

  const { error } = await supabase
    .from("jobs")
    // Same reset as the employer's own Repost: a new hiring round is announced
    // to the group again and re-alerts subscribed seekers, rather than quietly
    // reappearing in the app where only someone already browsing would see it.
    .update({
      deadline: newDeadline,
      status: "active",
      scheduled_at: null,
      pre_approved: false,
      last_posted_at: new Date().toISOString(),
      filled_at: null,
      announced_at: null,
      announced_message_id: null,
      announce_attempts: 0,
      alerts_queued_at: null,
    })
    .eq("id", jobId);

  if (error) throw error;
  await logActivity("repost_job", jobId, { newDeadline });
  return { success: true };
}

export async function scheduleJobPost(jobId: string, scheduledAt: string) {
  await requirePermission("manageJobs");

  const supabase = getSupabase();
  const { error } = await supabase
    .from("jobs")
    .update({ status: "scheduled", scheduled_at: scheduledAt })
    .eq("id", jobId);

  if (error) {
    const { error: err2 } = await supabase
      .from("jobs")
      .update({ status: "scheduled" })
      .eq("id", jobId);
    if (err2) throw err2;
  }
  return { success: true, scheduledAt };
}

/** Admin reviews a scheduled (non-auto-publish) job before its scheduled_at
 *  time arrives. This does NOT publish it early -- it stays 'scheduled' and
 *  still only goes live at the exact time the employer chose. It just tells
 *  job-expiration-cron, once that time comes, to route it straight to
 *  'active' instead of dropping it into 'pending' for someone to notice
 *  later. */
export async function approveScheduledJob(jobId: string) {
  await requirePermission("manageJobs");

  const supabase = getSupabase();
  const { data: existing } = await supabase.from("jobs").select("id, status").eq("id", jobId).maybeSingle();
  if (!existing || existing.status !== "scheduled") throw new Error("Only scheduled jobs can be pre-approved.");

  const { error } = await supabase.from("jobs").update({ pre_approved: true }).eq("id", jobId);
  if (error) throw error;
  await logActivity("pre_approve_scheduled_job", jobId);
  return { success: true };
}

/** Cancels a scheduled job before it goes live -- closes it outright (same
 *  meaning as closing any other job) rather than leaving it dangling in a
 *  half-scheduled state. The employer can Repost it later if they want to
 *  try again with a fresh deadline. */
export async function cancelScheduledJob(jobId: string) {
  await requirePermission("manageJobs");

  const supabase = getSupabase();
  const { data: existing } = await supabase.from("jobs").select("id, status").eq("id", jobId).maybeSingle();
  if (!existing || existing.status !== "scheduled") throw new Error("Only scheduled jobs can be cancelled.");

  const { error } = await supabase.from("jobs").update({ status: "closed", scheduled_at: null, pre_approved: false }).eq("id", jobId);
  if (error) throw error;
  await logActivity("cancel_scheduled_job", jobId);
  return { success: true };
}

export async function checkTemplateStatus(templateId: string) {
  if (!verifySessionValue((await cookies()).get("admin_session")?.value)) throw new Error("Unauthorized");

  const supabase = getSupabase();
  const { data: tpl } = await supabase.from("vacancy_templates").select("title, updated_at").eq("id", templateId).single();
  if (!tpl) return null;

  const { data: employer } = await supabase.from("employers").select("id").eq("business_name", "JobsAdis").maybeSingle();
  if (!employer) return { status: "new" };

  const { data: job } = await supabase
    .from("jobs")
    .select("created_at")
    .eq("employer_id", employer.id)
    .eq("title", tpl.title)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!job) return { status: "new" };

  const tplUpdated = new Date(tpl.updated_at || Date.now()).getTime();
  const jobCreated = new Date(job.created_at).getTime();

  if (jobCreated > tplUpdated) {
    return { status: "same", lastPosted: job.created_at };
  } else {
    return { status: "changed", lastPosted: job.created_at };
  }
}

// ── Platform Employer Helper ──────────────────────────────────────────────────
// Resolves the employer ID used for platform-posted jobs.
// Strategy:
//   1. Read from app_config key "platform_employer_id" (fastest, cached after first run)
//   2. Fallback: search employers table by business_name "JobsAdis" or "JobsAddis"
// Never touches the users table — avoids conflicts with admin accounts.
async function getPlatformEmployerId(supabase: ReturnType<typeof getSupabase>): Promise<{ id: string } | { error: string }> {
  // 1. Try cached config
  const { data: cfg } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", "platform_employer_id")
    .maybeSingle();
  if (cfg?.value) return { id: cfg.value };

  // 2. Try known platform business names
  const names = ["Addis Jobs", "JobsAdis", "JobsAddis", "Jobs Addis", "jobsaddis"];
  for (const name of names) {
    const { data: emp } = await supabase
      .from("employers")
      .select("id")
      .ilike("business_name", name)
      .maybeSingle();
    if (emp?.id) {
      // Cache it for next time
      await supabase.from("app_config").upsert(
        { key: "platform_employer_id", value: emp.id, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
      return { id: emp.id };
    }
  }

  return { error: "Platform employer not found. Please set the \"platform_employer_id\" key in app_config with the correct employer ID." };
}

export type PlatformProfileResult =
  | { success: true; businessName: string; logoUrl: string | null }
  | { success: false; error: string };

/** The picture shown on any job posted from a (global) vacancy template —
 *  those posts all share one "platform employer" identity rather than a
 *  real business, so there's exactly one picture to manage here, shared
 *  across whichever admin sets it. */
export async function getPlatformEmployerProfile(): Promise<PlatformProfileResult> {
  const admin = await getLoggedInAdmin();
  if (!admin) return { success: false, error: "Unauthorized" };

  const supabase = getSupabase();
  const result = await getPlatformEmployerId(supabase);
  if ("error" in result) return { success: false, error: result.error };

  const { data, error } = await supabase
    .from("employers")
    .select("business_name, logo_url")
    .eq("id", result.id)
    .maybeSingle();

  if (error || !data) {
    console.error("getPlatformEmployerProfile failed:", error);
    return { success: false, error: "Failed to load platform profile." };
  }

  return { success: true, businessName: data.business_name, logoUrl: data.logo_url || null };
}

export type UpdatePlatformLogoResult = { success: true; logoUrl: string | null } | { success: false; error: string };

export async function updatePlatformEmployerLogo(formData: FormData): Promise<UpdatePlatformLogoResult> {
  const admin = await getLoggedInAdmin();
  if (!admin) return { success: false, error: "Unauthorized" };
  if (!admin.permissions.manageEmployers) return { success: false, error: "Permission denied" };

  const supabase = getSupabase();
  const result = await getPlatformEmployerId(supabase);
  if ("error" in result) return { success: false, error: result.error };
  const platformEmployerId = result.id;

  const { data: current, error: curErr } = await supabase
    .from("employers")
    .select("logo_url")
    .eq("id", platformEmployerId)
    .maybeSingle();
  if (curErr) {
    console.error("updatePlatformEmployerLogo lookup failed:", curErr);
    return { success: false, error: "Failed to load current platform profile." };
  }

  const removeLogo = formData.get("removeLogo") === "true";
  const logoFile = formData.get("logo");
  let finalLogoUrl: string | null = current?.logo_url || null;

  if (logoFile instanceof File && logoFile.size > 0) {
    if (!logoFile.type.startsWith("image/")) return { success: false, error: "Photo must be an image file." };
    if (logoFile.size > 5 * 1024 * 1024) return { success: false, error: "Photo must be smaller than 5MB." };

    const fileExt = logoFile.name.split(".").pop() || "jpg";
    const fileName = `${platformEmployerId}-${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from("logos").upload(fileName, logoFile);
    if (uploadError) return { success: false, error: "Failed to upload photo." };

    const { data: publicUrlData } = supabase.storage.from("logos").getPublicUrl(fileName);
    finalLogoUrl = publicUrlData.publicUrl;
  } else if (removeLogo) {
    finalLogoUrl = null;
  }

  const { error: updateError } = await supabase
    .from("employers")
    .update({ logo_url: finalLogoUrl })
    .eq("id", platformEmployerId);
  if (updateError) {
    console.error("updatePlatformEmployerLogo update failed:", updateError);
    return { success: false, error: "Failed to save photo." };
  }

  if (finalLogoUrl !== current?.logo_url && current?.logo_url) {
    const oldPath = current.logo_url.split("/logos/")[1];
    if (oldPath) {
      try {
        await supabase.storage.from("logos").remove([oldPath]);
      } catch (err) {
        console.error("Failed to remove old platform logo file:", err);
      }
    }
  }

  await logActivity("update_platform_profile_photo", platformEmployerId);
  return { success: true, logoUrl: finalLogoUrl };
}

/** "Post Now" on the Posts tab -- creates a new platform job directly, without
 *  going through a saved template. Mirrors the employer dashboard's
 *  createEmployerJob, but attributes the job to the platform employer and
 *  publishes it immediately (admin posts don't go through a review step). */
export async function createPlatformJob(form: VacancyFormState): Promise<{ success: true } | { success: false; error: string }> {
  await requirePermission("manageJobs");

  const errors = validateVacancyForm(form);
  if (errors) return { success: false, error: Object.values(errors)[0]! };

  const supabase = getSupabase();

  const employerResult = await getPlatformEmployerId(supabase);
  if ("error" in employerResult) return { success: false, error: employerResult.error };

  const description = buildJobDescription(form);
  const { salary_min, salary_max } = resolveSalary(form);

  const { data: inserted, error } = await supabase.from("jobs").insert({
    employer_id: employerResult.id,
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
    deadline: form.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    quantity: form.quantity || 1,
    status: "active",
  }).select("id").single();

  if (error) return { success: false, error: error.message || "Failed to post job" };
  await logActivity("create_platform_job", inserted.id, { title: form.title });
  return { success: true };
}

export async function postJobFromTemplate(templateId: string) {
  if (!verifySessionValue((await cookies()).get("admin_session")?.value)) return { success: false, error: "Unauthorized" };

  const supabase = getSupabase();

  // Fetch the template
  const { data: tpl, error: tplErr } = await supabase
    .from("vacancy_templates")
    .select("*")
    .eq("id", templateId)
    .single();
  if (tplErr || !tpl) return { success: false, error: "Template not found" };

  const description = buildJobDescription(tpl as any);
  const { salary_min, salary_max } = resolveSalary(tpl as any);

  // Resolve the platform employer
  const employerResult = await getPlatformEmployerId(supabase);
  if ("error" in employerResult) return { success: false, error: employerResult.error };
  const platformEmployerId = employerResult.id;

  const { error: jobErr } = await supabase.from("jobs").insert({
    employer_id: platformEmployerId,
    title: tpl.title,
    category: tpl.job_category,
    location: tpl.location || "Addis Ababa",
    neighborhood: tpl.location || "Addis Ababa",
    job_type: tpl.employment_type || "Full Time",
    salary_min,
    salary_max,
    currency: "ETB",
    description,
    full_description: description,
    requirements: buildRequirementsJson(tpl as any),
    min_years_experience: coerceYears((tpl as any).min_years_experience),
    gender_preference: coerceGender((tpl as any).gender_preference),
    deadline: tpl.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    quantity: tpl.quantity || 1,
    status: "active",
  });

  if (jobErr) return { success: false, error: jobErr.message || "Failed to insert job" };
  return { success: true };
}

export async function scheduleJobFromTemplate(templateId: string, scheduledAt: string) {
  if (!verifySessionValue((await cookies()).get("admin_session")?.value)) return { success: false, error: "Unauthorized" };

  const supabase = getSupabase();
  const { data: tpl, error: tplErr } = await supabase
    .from("vacancy_templates")
    .select("*")
    .eq("id", templateId)
    .single();
  if (tplErr || !tpl) return { success: false, error: "Template not found" };

  const description = buildJobDescription(tpl as any);
  const { salary_min, salary_max } = resolveSalary(tpl as any);

  // Resolve the platform employer
  const employerResult2 = await getPlatformEmployerId(supabase);
  if ("error" in employerResult2) return { success: false, error: employerResult2.error };
  const platformEmployerId2 = employerResult2.id;

  const { error: jobErr } = await supabase.from("jobs").insert({
    employer_id: platformEmployerId2,
    title: tpl.title,
    category: tpl.job_category,
    location: tpl.location || "Addis Ababa",
    neighborhood: tpl.location || "Addis Ababa",
    job_type: tpl.employment_type || "Full Time",
    salary_min,
    salary_max,
    currency: "ETB",
    description,
    full_description: description,
    requirements: buildRequirementsJson(tpl as any),
    min_years_experience: coerceYears((tpl as any).min_years_experience),
    gender_preference: coerceGender((tpl as any).gender_preference),
    deadline: tpl.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    quantity: tpl.quantity || 1,
    status: "scheduled",
    scheduled_at: scheduledAt,
  });

  if (jobErr) return { success: false, error: jobErr.message || "Failed to insert scheduled job" };
  return { success: true };
}

// ── Platform Job Management (Scheduled Posts / L.Jobs tabs) ──────────────────
// These operate directly on jobs posted by the admin under the platform
// employer (via postJobFromTemplate / scheduleJobFromTemplate above).

export async function getPlatformJobs() {
  if (!verifySessionValue((await cookies()).get("admin_session")?.value)) throw new Error("Unauthorized");

  const supabase = getSupabase();
  const employerResult = await getPlatformEmployerId(supabase);
  if ("error" in employerResult) return [];

  const { data: jobs, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("employer_id", employerResult.id)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return jobs || [];
}

export async function updatePlatformJob(jobId: string, form: VacancyFormState, scheduledAt?: string) {
  await requirePermission("manageJobs");

  const errors = validateVacancyForm(form);
  if (errors) return { success: false, error: Object.values(errors)[0] };

  const supabase = getSupabase();

  const description = buildJobDescription(form);
  const { salary_min, salary_max } = resolveSalary(form);

  const update: Record<string, unknown> = {
    title: form.title,
    category: form.job_category,
    location: form.location,
    neighborhood: form.location,
    job_type: form.employment_type,
    salary_min,
    salary_max,
    currency: "ETB",
    description,
    full_description: description,
    requirements: buildRequirementsJson(form),
    min_years_experience: form.min_years_experience,
    gender_preference: coerceGender(form.gender_preference),
    deadline: form.deadline,
    quantity: form.quantity,
  };
  if (scheduledAt) {
    update.scheduled_at = scheduledAt;
  }

  const { error } = await supabase.from("jobs").update(update).eq("id", jobId);
  if (error) return { success: false, error: error.message || "Failed to update job" };
  await logActivity("edit_platform_job", jobId, {});
  return { success: true };
}

/** Reposts an expired platform job: requires a new deadline, rebuilds the
 *  full listing (title through Benefits, matching the create flow) and
 *  republishes it to 'active' or 'pending' depending on whether the platform
 *  employer auto-publishes -- mirrors the employer-side repost flow
 *  (repostEmployerJob). */
export async function repostPlatformJob(jobId: string, form: VacancyFormState): Promise<{ success: true; status: "active" | "pending" } | { success: false; error: string }> {
  await requirePermission("manageJobs");

  const errors = validateVacancyForm(form, { requireDeadline: true });
  if (errors) return { success: false, error: Object.values(errors)[0]! };

  const supabase = getSupabase();

  const { data: existing } = await supabase.from("jobs").select("id, employer_id, status").eq("id", jobId).maybeSingle();
  if (!existing) return { success: false, error: "Job not found" };
  if (existing.status !== "expired") return { success: false, error: "Only expired jobs can be reposted." };

  const { data: employer } = await supabase.from("employers").select("auto_publish").eq("id", existing.employer_id).maybeSingle();
  const newStatus: "active" | "pending" = employer?.auto_publish ? "active" : "pending";

  const description = buildJobDescription(form);
  const { salary_min, salary_max } = resolveSalary(form);

  const { error } = await supabase.from("jobs").update({
    title: form.title,
    category: form.job_category,
    location: form.location,
    neighborhood: form.location,
    job_type: form.employment_type,
    salary_min,
    salary_max,
    currency: "ETB",
    description,
    full_description: description,
    requirements: buildRequirementsJson(form),
    min_years_experience: form.min_years_experience,
    gender_preference: coerceGender(form.gender_preference),
    deadline: form.deadline,
    quantity: form.quantity,
    status: newStatus,
    last_posted_at: new Date().toISOString(),
  }).eq("id", jobId);

  if (error) return { success: false, error: error.message || "Failed to repost job" };
  await logActivity("repost_platform_job", jobId, { status: newStatus });
  return { success: true, status: newStatus };
}

export async function deletePlatformJob(jobId: string) {
  await requirePermission("manageJobs");
  const supabase = getSupabase();
  const { error } = await supabase.from("jobs").delete().eq("id", jobId);
  if (error) throw error;
  await logActivity("delete_platform_job", jobId, {});
  return { success: true };
}

// ── Post For Employer (PFE) ──────────────────────────────────────────────────
//
// An admin types a vacancy on a registered employer's behalf -- the employer
// phoned it in, or doesn't want to use the Mini App. The row that comes out is
// an ordinary employer job (their employer_id, their name and logo on the
// seeker card, their applicants in their own dashboard); the only trace of how
// it got there is jobs.posted_by_admin, which the admin dashboard reads and
// nothing else does.
//
// Distinct from createPlatformJob above, which files a job under the *platform*
// employer so the seeker sees "JobsAddis". That is for the platform's own
// listings; this is for a real business's listing that an admin happened to
// type.
//
// The rules an employer posts under are inherited, not waived -- a lapsed plan
// blocks, and the post spends one of the employer's daily allowance -- because
// PFE is a typing service, not a way to buy an employer something their package
// didn't include. The one rule that *is* waived is the review queue: a job that
// lands in `pending` waits for an admin to approve it, and this one was written
// by an admin already.

const PFE_DEFAULT_DAILY_LIMIT = 15;

export type PfeEmployer = {
  id: string;
  businessName: string;
  businessType: string | null;
  telegramId: number | null;
  /** Date-only (YYYY-MM-DD) -- it feeds the deadline input's `max` attribute. */
  packageExpiresAt: string | null;
  /** -1 means unlimited, matching the employer dashboard's convention. */
  dailyPostLimit: number;
  postedToday: number;
  /** Why this employer can't be posted for right now, or null if they can. */
  blockedReason: "expired" | "limit" | null;
};

/** Counted on last_posted_at rather than created_at, exactly as the employer's
 *  own limit is: a repost spends one of today's posts too, and a job carried
 *  over from an earlier day does not. */
async function countPostedToday(
  supabase: ReturnType<typeof getSupabase>,
  employerIds: string[]
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  if (employerIds.length === 0) return counts;
  const { data } = await supabase
    .from("jobs")
    .select("employer_id")
    .in("employer_id", employerIds)
    .gte("last_posted_at", startOfAddisDay().toISOString());
  for (const row of data || []) {
    counts[(row as any).employer_id] = (counts[(row as any).employer_id] || 0) + 1;
  }
  return counts;
}

function toPfeEmployer(row: any, postedToday: number): PfeEmployer {
  const dailyPostLimit = row.daily_post_limit ?? PFE_DEFAULT_DAILY_LIMIT;
  const expired = isSubscriptionExpired(row.package_expires_at);
  const atLimit = dailyPostLimit !== -1 && postedToday >= dailyPostLimit;
  return {
    id: row.id,
    businessName: row.business_name,
    businessType: row.business_type ?? null,
    telegramId: row.users?.telegram_id ?? null,
    packageExpiresAt: row.package_expires_at ? String(row.package_expires_at).split("T")[0] : null,
    dailyPostLimit,
    postedToday,
    // Expiry is reported ahead of the limit: renewing fixes both, waiting for
    // tomorrow only fixes one, so the more useful instruction wins.
    blockedReason: expired ? "expired" : atLimit ? "limit" : null,
  };
}

/** The employer picker on the PFE tab. Ordered by business name rather than by
 *  signup date -- an admin arrives here already knowing which business they are
 *  posting for, so alphabetical is what makes it findable. */
export async function getPfeEmployers(search: string = "", page: number = 1, pageSize: number = 20) {
  await requirePermission("manageEmployers");
  const supabase = getSupabase();

  let query = supabase
    .from("employers")
    // Same `!inner` + role filter as searchEmployers: it keeps admin-linked
    // employer rows out at the DB level so `count` matches what comes back and
    // pagination can't run past the real data.
    .select("id, business_name, business_type, package_expires_at, daily_post_limit, users!inner(telegram_id, role)", { count: "exact" })
    .neq("users.role", "admin");

  const q = (search || "").trim();
  if (q) {
    if (/^\d+$/.test(q)) query = query.eq("users.telegram_id", q);
    else query = query.ilike("business_name", `%${q}%`);
  }

  const from = (page - 1) * pageSize;
  const { data, count, error } = await query
    .order("business_name", { ascending: true })
    .range(from, from + pageSize - 1);
  if (error) throw new Error(error.message);

  const rows = data || [];
  const postedToday = await countPostedToday(supabase, rows.map((r: any) => r.id));

  return {
    employers: rows.map((r: any) => toPfeEmployer(r, postedToday[r.id] || 0)),
    total: count || 0,
    page,
    pageSize,
  };
}

/** One employer's current posting position, re-read at submit time. The picker
 *  already showed this, but a plan can lapse and an allowance can be spent by
 *  the employer themselves while the admin is still filling in the form. */
async function loadPfeEmployer(
  supabase: ReturnType<typeof getSupabase>,
  employerId: string
): Promise<PfeEmployer | null> {
  const { data } = await supabase
    .from("employers")
    .select("id, business_name, business_type, package_expires_at, daily_post_limit, users(telegram_id)")
    .eq("id", employerId)
    .maybeSingle();
  if (!data) return null;
  const counts = await countPostedToday(supabase, [employerId]);
  return toPfeEmployer(data, counts[employerId] || 0);
}

export async function getPfeEmployer(employerId: string): Promise<PfeEmployer | null> {
  await requirePermission("manageEmployers");
  return loadPfeEmployer(getSupabase(), employerId);
}

function pfeBlockedMessage(employer: PfeEmployer): string | null {
  if (employer.blockedReason === "expired") {
    return `${employer.businessName}'s subscription has expired. Renew their plan before posting for them.`;
  }
  if (employer.blockedReason === "limit") {
    return `${employer.businessName} has used all ${employer.dailyPostLimit} of today's posts. Try again tomorrow.`;
  }
  return null;
}

/** Employers can't set a deadline past the end of the plan they're posting
 *  under, and neither can an admin posting for them. Blank defaults to 30 days
 *  out, clamped to the same cutoff. Mirrors resolveDeadline() on the employer
 *  side. */
function resolvePfeDeadline(formDeadline: string | null | undefined, maxDeadline: string | null): string {
  if (formDeadline) return formDeadline;
  const fallback = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  return maxDeadline && fallback > maxDeadline ? maxDeadline : fallback;
}

/** Tells the employer a job appeared under their name that they didn't type.
 *  Best-effort: a failed notification must not fail the post, since the job is
 *  already live by the time this runs and there is nothing to roll back to. */
async function notifyEmployerOfPfePost(
  supabase: ReturnType<typeof getSupabase>,
  employer: PfeEmployer,
  jobId: string,
  jobTitle: string
) {
  if (!employer.telegramId) return;
  // company_name is NOT NULL on this table. It carries the employer's own
  // business name here, matching every other notification about one of their
  // jobs -- the bell's copy for this type names JobsAddis as the actor itself,
  // so this field is the subject, not the sender.
  const { error } = await supabase.from("notifications").insert({
    user_telegram_id: employer.telegramId,
    company_name: employer.businessName,
    job_title: jobTitle,
    job_id: jobId,
    type: "posted_for_you",
    read: false,
  });
  // Logged rather than thrown: the job is already live by the time this runs,
  // so there is nothing to roll back to and failing the whole action would
  // report a successful post as an error.
  if (error) console.error("Failed to notify employer of PFE post:", error);
}

export async function createJobForEmployer(
  employerId: string,
  form: VacancyFormState
): Promise<{ success: true; jobId: string } | { success: false; error: string }> {
  await requirePermission("manageEmployers");
  const admin = await getLoggedInAdmin();
  if (!admin) return { success: false, error: "Unauthorized" };

  const supabase = getSupabase();
  const employer = await loadPfeEmployer(supabase, employerId);
  if (!employer) return { success: false, error: "Employer not found." };

  const blocked = pfeBlockedMessage(employer);
  if (blocked) return { success: false, error: blocked };

  const errors = validateVacancyForm(form, { maxDeadline: employer.packageExpiresAt });
  if (errors) return { success: false, error: Object.values(errors)[0]! };

  const description = buildJobDescription(form);
  const { salary_min, salary_max } = resolveSalary(form);

  const { data: inserted, error } = await supabase
    .from("jobs")
    .insert({
      employer_id: employerId,
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
      min_years_experience: coerceYears(form.min_years_experience),
      gender_preference: coerceGender(form.gender_preference),
      deadline: resolvePfeDeadline(form.deadline, employer.packageExpiresAt),
      quantity: form.quantity || 1,
      // Live immediately whatever the employer's auto_publish says. The review
      // queue exists to check content nobody at JobsAddis has read, and an
      // admin wrote this one -- queueing it would mean an admin approving their
      // own work. last_posted_at is left to its now() default, which is what
      // makes this count against the employer's allowance for today.
      status: "active",
      posted_by_admin: admin.username,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message || "Failed to post job" };

  await logActivity("create_job_for_employer", inserted.id, {
    employerId,
    businessName: employer.businessName,
    title: form.title,
  });
  await notifyEmployerOfPfePost(supabase, employer, inserted.id, form.title);

  return { success: true, jobId: inserted.id };
}

export async function updateJobForEmployer(
  jobId: string,
  form: VacancyFormState
): Promise<{ success: true } | { success: false; error: string }> {
  await requirePermission("manageEmployers");
  const supabase = getSupabase();

  const { data: job } = await supabase
    .from("jobs")
    .select("id, employer_id, employers(business_name, package_expires_at)")
    .eq("id", jobId)
    .maybeSingle();
  if (!job) return { success: false, error: "Job not found." };

  const employer: any = Array.isArray((job as any).employers) ? (job as any).employers[0] : (job as any).employers;
  const maxDeadline = employer?.package_expires_at ? String(employer.package_expires_at).split("T")[0] : null;

  const errors = validateVacancyForm(form, { maxDeadline });
  if (errors) return { success: false, error: Object.values(errors)[0]! };

  const description = buildJobDescription(form);
  const { salary_min, salary_max } = resolveSalary(form);

  // Status and posted_by_admin are deliberately absent: editing the wording of
  // a live job must not silently republish it, nor rewrite who first posted it.
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
      min_years_experience: coerceYears(form.min_years_experience),
      gender_preference: coerceGender(form.gender_preference),
      deadline: resolvePfeDeadline(form.deadline, maxDeadline),
      quantity: form.quantity || 1,
    })
    .eq("id", jobId);

  if (error) return { success: false, error: error.message || "Failed to update job" };
  await logActivity("edit_job_for_employer", jobId, {
    employerId: (job as any).employer_id,
    businessName: employer?.business_name,
    title: form.title,
  });
  return { success: true };
}

/** Hard delete, which takes the job's applications with it -- the UI asks for
 *  confirmation with the applicant count spelled out first. The count is read
 *  here too so the activity log records what was actually destroyed, which is
 *  the only place it survives afterwards. */
export async function deleteJobForEmployer(
  jobId: string
): Promise<{ success: true } | { success: false; error: string }> {
  await requirePermission("manageEmployers");
  const supabase = getSupabase();

  const { data: job } = await supabase
    .from("jobs")
    .select("id, title, employer_id, employers(business_name)")
    .eq("id", jobId)
    .maybeSingle();
  if (!job) return { success: false, error: "Job not found." };

  const { count: applicantCount } = await supabase
    .from("applications")
    .select("id", { count: "exact", head: true })
    .eq("job_id", jobId);

  const { error } = await supabase.from("jobs").delete().eq("id", jobId);
  if (error) return { success: false, error: error.message || "Failed to delete job" };

  const employer: any = Array.isArray((job as any).employers) ? (job as any).employers[0] : (job as any).employers;
  await logActivity("delete_job_for_employer", jobId, {
    employerId: (job as any).employer_id,
    businessName: employer?.business_name,
    title: (job as any).title,
    applicantsDeleted: applicantCount || 0,
  });
  return { success: true };
}

export type PfeEmployerGroup = {
  employerId: string;
  businessName: string;
  jobCount: number;
  lastPostedAt: string | null;
};

/** The PFE tab's list, grouped by business the same way Job Posting Moderation
 *  is. Only jobs an admin posted appear -- an employer's own postings are
 *  already listed under moderation, and repeating them here would make this a
 *  second copy of that tab rather than a record of what we typed for them. */
export async function getPfeEmployerGroups(): Promise<PfeEmployerGroup[]> {
  await requirePermission("manageEmployers");
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("jobs")
    .select("employer_id, last_posted_at, created_at, employers(business_name)")
    .not("posted_by_admin", "is", null);
  if (error) throw new Error(error.message);

  const groups: Record<string, PfeEmployerGroup> = {};
  for (const row of (data || []) as any[]) {
    const employer = Array.isArray(row.employers) ? row.employers[0] : row.employers;
    const existing = groups[row.employer_id];
    const postedAt = row.last_posted_at || row.created_at || null;
    if (!existing) {
      groups[row.employer_id] = {
        employerId: row.employer_id,
        businessName: employer?.business_name || "Unknown employer",
        jobCount: 1,
        lastPostedAt: postedAt,
      };
    } else {
      existing.jobCount += 1;
      if (postedAt && (!existing.lastPostedAt || postedAt > existing.lastPostedAt)) {
        existing.lastPostedAt = postedAt;
      }
    }
  }

  return Object.values(groups).sort((a, b) => a.businessName.localeCompare(b.businessName));
}

export type PfeJob = {
  id: string;
  title: string;
  status: string;
  deadline: string | null;
  postedAt: string | null;
  postedByAdmin: string | null;
  applicantCount: number;
  /** The raw `jobs` row, so the Edit modal can rebuild the form through
   *  jobRowToForm() without a second fetch. */
  raw: any;
};

/** One employer's admin-posted jobs, newest first, each with the applicant
 *  count the delete confirmation needs. */
export async function getPfeJobsForEmployer(employerId: string): Promise<PfeJob[]> {
  await requirePermission("manageEmployers");
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("employer_id", employerId)
    .not("posted_by_admin", "is", null)
    .order("last_posted_at", { ascending: false });
  if (error) throw new Error(error.message);

  const jobs = (data || []) as any[];
  const applicantCounts: Record<string, number> = {};
  if (jobs.length > 0) {
    const { data: apps } = await supabase
      .from("applications")
      .select("job_id")
      .in("job_id", jobs.map((j) => j.id));
    for (const row of (apps || []) as any[]) {
      applicantCounts[row.job_id] = (applicantCounts[row.job_id] || 0) + 1;
    }
  }

  return jobs.map((j) => ({
    id: j.id,
    title: j.title,
    status: j.status,
    deadline: j.deadline || null,
    postedAt: j.last_posted_at || j.created_at || null,
    postedByAdmin: j.posted_by_admin || null,
    applicantCount: applicantCounts[j.id] || 0,
    raw: j,
  }));
}

export async function addEmployer(telegramId: number, businessName: string, businessType: string, packageId: string | null) {
  await requirePermission("manageEmployers");

  // Validate telegramId format (positive integer, 5-12 digits, no leading 0)
  const tgIdStr = telegramId.toString();
  if (!/^[1-9][0-9]{4,11}$/.test(tgIdStr)) {
    throw new Error("Telegram ID must be a valid number between 5 and 12 digits, and cannot start with 0.");
  }
  if (!packageId) throw new Error("A package must be selected.");

  const supabase = getSupabase();
  
  // 1. Check if user exists
  const { data: existingUser, error: userErr } = await supabase
    .from("users")
    .select("id, role")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (userErr) throw userErr;

  let userId: string;

  if (existingUser) {
    userId = existingUser.id;
    
    // Check if employer record already exists for this user
    const { data: existingEmployer, error: empErr } = await supabase
      .from("employers")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (empErr) throw empErr;

    if (existingEmployer) {
      throw new Error("An employer with this Telegram ID already exists.");
    }

    if (existingUser.role !== "employer") {
      const { error: updateRoleErr } = await supabase
        .from("users")
        .update({ role: "employer" })
        .eq("id", userId);
      if (updateRoleErr) throw updateRoleErr;
    }
  } else {
    const { data: newUser, error: insertUserErr } = await supabase
      .from("users")
      .insert({ telegram_id: telegramId, role: "employer" })
      .select("id")
      .single();
    if (insertUserErr) throw insertUserErr;
    userId = newUser.id;
  }

  // 2. Generate a unique 5-digit authorization number
  const generateAuthNumber = () => String(Math.floor(10000 + Math.random() * 90000));
  let authNumber = generateAuthNumber();
  // Ensure uniqueness (retry up to 5 times)
  for (let i = 0; i < 5; i++) {
    const { data: existing } = await supabase
      .from("employers")
      .select("id")
      .eq("authorization_number", authNumber)
      .maybeSingle();
    if (!existing) break;
    authNumber = generateAuthNumber();
  }

  let packageExpiresAt: string | null = null;
  // Try to resolve package duration (only if packages table exists in prod)
  if (packageId) {
    try {
      const { data: pkg, error: pkgErr } = await supabase
        .from("packages")
        .select("duration_days")
        .eq("id", packageId)
        .maybeSingle();
      if (!pkgErr && pkg) {
        const now = new Date();
        now.setDate(now.getDate() + pkg.duration_days);
        packageExpiresAt = now.toISOString();
      }
    } catch (_) {
      // packages table not yet migrated – skip silently
    }
  }

  // 3. Try inserting with package fields; fall back without them if columns don't exist yet
  let newEmp: any;
  const baseInsert = {
    user_id: userId,
    business_name: businessName,
    business_type: businessType,
    status: "approved",
    authorization_number: authNumber,
  };

  const { data: empWithPkg, error: insertEmpErrFull } = await supabase
    .from("employers")
    .insert({ ...baseInsert, active_package_id: packageId || null, package_expires_at: packageExpiresAt })
    .select("*, users(telegram_id)")
    .single();

  if (insertEmpErrFull) {
    // If error is about unknown column (migration not applied), retry without package fields
    if (insertEmpErrFull.code === "42703" || insertEmpErrFull.message?.includes("active_package_id") || insertEmpErrFull.message?.includes("package_expires_at")) {
      const { data: empFallback, error: insertEmpErrFallback } = await supabase
        .from("employers")
        .insert(baseInsert)
        .select("*, users(telegram_id)")
        .single();
      if (insertEmpErrFallback) throw insertEmpErrFallback;
      newEmp = empFallback;
    } else {
      throw insertEmpErrFull;
    }
  } else {
    newEmp = empWithPkg;
  }

  return { success: true, employer: newEmp, authorizationNumber: authNumber };
}

export async function updateEmployer(employerId: string, businessName: string, businessType: string, dailyPostLimit: number, passwordAttempt: string, packageId?: string | null, tinNumber?: string) {
  await requirePermission("manageEmployers");

  const supabase = getSupabase();
  if (!(await verifyConfigPassword("admin_password", passwordAttempt, ADMIN_PASSWORD_FALLBACK))) {
    throw new Error("Incorrect admin password");
  }

  if (!businessName.trim()) throw new Error("Business name cannot be empty.");
  if (![15, 30, -1].includes(dailyPostLimit)) throw new Error("Invalid post limit value.");

  const updateFields: any = {
    business_name: businessName.trim(),
    business_type: businessType.trim(),
    daily_post_limit: dailyPostLimit,
  };

  // Admin is the only party who can correct a TIN after onboarding -- the
  // employer's own profile tab shows it read-only. Undefined means "not part
  // of this edit"; an empty string clears it, which re-triggers the dashboard
  // TIN gate for that employer rather than leaving a wrong number on file.
  if (tinNumber !== undefined) {
    const tin = normalizeTin(tinNumber);
    if (tin) {
      const tinError = validateTin(tin);
      if (tinError) throw new Error(tinError);
      updateFields.tin_number = tin;
    } else {
      updateFields.tin_number = null;
    }
  }

  if (packageId !== undefined) {
    if (!packageId) throw new Error("A package must be selected.");
    const { data: pkg, error: pkgErr } = await supabase
      .from("packages")
      .select("duration_days")
      .eq("id", packageId)
      .maybeSingle();
    if (pkgErr) throw pkgErr;
    if (!pkg) throw new Error("Selected package not found.");
    const now = new Date();
    now.setDate(now.getDate() + pkg.duration_days);
    updateFields.active_package_id = packageId;
    updateFields.package_expires_at = now.toISOString();
    updateFields.renewal_requested = false;
    updateFields.renewal_requested_at = null;
    updateFields.renewal_seen_at = null;
    updateFields.expiry_warning_sent = false;
  }

  const { data, error } = await supabase
    .from("employers")
    .update(updateFields)
    .eq("id", employerId)
    .select("*, users(telegram_id)")
    .single();

  if (isDuplicateTin(error)) throw new Error(TIN_TAKEN_ERROR);
  if (error) throw error;
  if (packageId !== undefined) {
    await logActivity("assign_package", employerId, { packageId });
  }
  return { success: true, employer: data };
}

// Marks an employer's pending renewal request as seen -- tells the employer
// their request reached admin (who'll follow up by phone) without lifting
// the 5-hour cooldown on re-requesting, and without touching
// renewal_requested itself (the request is still open until an admin
// actually renews the package via updateEmployer).
export async function acknowledgeEmployerRenewal(employerId: string) {
  await requirePermission("manageEmployers");

  const { data, error } = await getSupabase()
    .from("employers")
    .update({ renewal_seen_at: new Date().toISOString() })
    .eq("id", employerId)
    .select("*, users(telegram_id)")
    .single();
  if (error) throw error;
  await logActivity("acknowledge_renewal_request", employerId);
  return { success: true, employer: data };
}

export async function updateEmployerAutoPublish(employerId: string, autoPublish: boolean) {
  await requirePermission("manageEmployers");

  const { error } = await getSupabase().from("employers").update({ auto_publish: autoPublish }).eq("id", employerId);
  if (error) throw error;
  await logActivity(autoPublish ? "enable_auto_publish" : "disable_auto_publish", employerId);
  return { success: true };
}

export async function deleteEmployer(employerId: string, passwordAttempt: string) {
  const admin = await getLoggedInAdmin();
  if (!admin) return { success: false, error: "Unauthorized" };
  if (!admin.permissions.manageEmployers) return { success: false, error: "Permission denied" };

  const supabase = getSupabase();
  if (!(await verifyConfigPassword("admin_password", passwordAttempt, ADMIN_PASSWORD_FALLBACK))) {
    return { success: false, error: "Incorrect admin password" };
  }

  // 1. Fetch employer to get the logo URL and linked user_id before deletion
  const { data: employer } = await supabase
    .from("employers")
    .select("logo_url, user_id")
    .eq("id", employerId)
    .single();

  // 2. Delete the linked users row -- this cascades to delete the employers
  // row (and in turn its jobs/applications/templates) via ON DELETE CASCADE,
  // so the Telegram ID is freed up to onboard as a brand-new user rather than
  // being permanently stuck as a phantom "employer" with no employer row.
  const { error } = employer?.user_id
    ? await supabase.from("users").delete().eq("id", employer.user_id)
    : await supabase.from("employers").delete().eq("id", employerId);
  if (error) return { success: false, error: "Database error: Failed to delete" };
  await logActivity("delete_employer", employerId);

  // 3. Delete logo from storage if it exists
  if (employer?.logo_url) {
    const parts = employer.logo_url.split("/logos/");
    if (parts.length === 2) {
      const path = parts[1];
      await supabase.storage.from("logos").remove([path]);
    }
  }

  return { success: true };
}

// ── Special Requests ────────────────────────────────────────────────────────

export async function submitSpecialRequest(telegramId: number) {
  const supabase = getSupabase();
  
  // Verify user exists
  const { data: user } = await supabase.from("users").select("id, role").eq("telegram_id", telegramId).single();
  if (!user) return { success: false, error: "User not found" };

  // Fetch current requests
  const { data: srCfg } = await supabase.from("app_config").select("value").eq("key", "special_requests").maybeSingle();
  let specialRequests: any[] = [];
  try {
    if (srCfg?.value) specialRequests = JSON.parse(srCfg.value);
  } catch (e) {}

  // Check if already requested
  if (specialRequests.some((r) => r.telegramId === telegramId)) {
    return { success: true }; // Already requested, idempotent
  }

  // Append new request
  specialRequests.push({
    userId: user.id,
    telegramId,
    type: "ex_employer_to_job_seeker",
    requestedAt: new Date().toISOString()
  });

  await supabase.from("app_config").upsert({
    key: "special_requests",
    value: JSON.stringify(specialRequests),
    updated_at: new Date().toISOString()
  });

  return { success: true };
}

export async function approveSpecialRequest(userId: string, passwordAttempt: string) {
  const admin = await getLoggedInAdmin();
  if (!admin) return { success: false, error: "Unauthorized" };
  if (!admin.permissions.manageUsers) return { success: false, error: "Permission denied" };

  if (admin.role === "super_admin" && !(await verifyConfigPassword("admin_password", passwordAttempt, ADMIN_PASSWORD_FALLBACK))) {
    return { success: false, error: "Incorrect admin password" };
  }

  const supabase = getSupabase();

  // 1. Fetch old job seeker profile (if any) to get the stale CV URL
  const { data: oldProfile } = await supabase
    .from("profiles")
    .select("cv_url")
    .eq("user_id", userId)
    .maybeSingle();

  // 2. Delete the old CV from storage if it exists — free up space
  const oldCvPath = resumeStoragePath(oldProfile?.cv_url);
  if (oldCvPath) {
    await supabase.storage.from("resumes").remove([oldCvPath]);
  }

  // 3. Delete the old profile row entirely — forces fresh onboarding
  await supabase.from("profiles").delete().eq("user_id", userId);

  // 4. Change user role to job_seeker
  const { error } = await supabase.from("users").update({ role: "job_seeker" }).eq("id", userId);
  if (error) return { success: false, error: "Failed to update user role" };

  // 5. Remove from special_requests array
  const { data: srCfg } = await supabase.from("app_config").select("value").eq("key", "special_requests").maybeSingle();
  let specialRequests: any[] = [];
  try {
    if (srCfg?.value) specialRequests = JSON.parse(srCfg.value);
  } catch (e) {}

  const updatedRequests = specialRequests.filter((r) => r.userId !== userId);

  await supabase.from("app_config").upsert({
    key: "special_requests",
    value: JSON.stringify(updatedRequests),
    updated_at: new Date().toISOString()
  });

  return { success: true };
}

// Marks a special request as seen by an admin -- purely an internal read
// marker for the notification bell's unread count. Unlike renewal requests,
// nothing here is shown back to the requesting user, so it's safe to fire
// this the moment an admin opens the request rather than requiring a
// separate deliberate action.
export async function acknowledgeSpecialRequest(userId: string) {
  const admin = await getLoggedInAdmin();
  if (!admin) return { success: false, error: "Unauthorized" };

  const supabase = getSupabase();
  const { data: srCfg } = await supabase.from("app_config").select("value").eq("key", "special_requests").maybeSingle();
  let specialRequests: any[] = [];
  try {
    if (srCfg?.value) specialRequests = JSON.parse(srCfg.value);
  } catch (e) {}

  const updated = specialRequests.map((r) => r.userId === userId ? { ...r, seenAt: new Date().toISOString() } : r);

  await supabase.from("app_config").upsert({
    key: "special_requests",
    value: JSON.stringify(updated),
    updated_at: new Date().toISOString()
  });

  return { success: true };
}

// ── Content Management ────────────────────────────────────────────────────────

export async function getContentData() {
  if (!verifySessionValue((await cookies()).get("admin_session")?.value)) throw new Error("Unauthorized");

  const supabase = getSupabase();
  const [faqs, templates, config] = await Promise.all([
    supabase.from("faqs").select("*").order("display_order", { ascending: true }),
    supabase.from("vacancy_templates").select("*").order("created_at", { ascending: false }),
    supabase.from("onboarding_config").select("*")
  ]);

  return {
    faqs: faqs.data || [],
    templates: templates.data || [],
    onboardingConfig: config.data || []
  };
}

export async function upsertFaq(id: string | null, question: string, answer: string, display_order: number) {
  if (!verifySessionValue((await cookies()).get("admin_session")?.value)) throw new Error("Unauthorized");

  const { error } = await getSupabase().from("faqs").upsert({
    ...(id ? { id } : {}),
    question,
    answer,
    display_order,
    updated_at: new Date().toISOString()
  });

  if (error) throw error;
  return { success: true };
}

export async function deleteFaq(id: string) {
  if (!verifySessionValue((await cookies()).get("admin_session")?.value)) throw new Error("Unauthorized");

  const { error } = await getSupabase().from("faqs").delete().eq("id", id);
  if (error) throw error;
  return { success: true };
}


export async function upsertVacancyTemplate(payload: VacancyFormState) {
  if (!verifySessionValue((await cookies()).get("admin_session")?.value)) throw new Error("Unauthorized");

  const errors = validateVacancyForm(payload);
  if (errors) return { success: false, error: Object.values(errors)[0] };

  const supabase = getSupabase();
  const { id, ...data } = payload;

  const dbPayload = {
    ...(id ? { id } : {}),
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
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase.from("vacancy_templates").upsert(dbPayload);

  if (error) return { success: false, error: error.message || "Failed to save template" };
  return { success: true };
}

export async function deleteVacancyTemplate(id: string) {
  await requirePermission("manageConfiguration");

  const { error } = await getSupabase().from("vacancy_templates").delete().eq("id", id);
  if (error) throw error;
  return { success: true };
}

export async function updateOnboardingConfig(key: string, label: string, value: string) {
  await requirePermission("manageConfiguration");

  const { error } = await getSupabase().from("onboarding_config").upsert({
    key,
    label,
    value,
    updated_at: new Date().toISOString()
  });

  if (error) throw error;
  return { success: true };
}

export async function getPricingConfig() {
  const supabase = getSupabase();
  const { data: pCfg } = await supabase.from("app_config").select("value").eq("key", "pricing_config").maybeSingle();
  let pricingConfig = null;
  try {
    if (pCfg?.value) pricingConfig = JSON.parse(pCfg.value);
  } catch (e) {}
  return pricingConfig;
}

export async function updatePricingConfig(config: any) {
  await requirePermission("manageConfiguration");

  const supabase = getSupabase();
  const { error } = await supabase.from("app_config").upsert({
    key: "pricing_config",
    value: JSON.stringify(config),
    updated_at: new Date().toISOString()
  });

  if (error) throw error;
  return { success: true };
}

export async function getProfessionCounts() {
  await requirePermission("manageUsers");
  
  const supabase = getSupabase();
  // Only count profiles belonging to job_seekers so the numbers match the overview stat
  const { data, error } = await supabase
    .from("profiles")
    .select("selected_categories, users!inner(role)")
    .eq("users.role", "job_seeker");
  
  if (error) throw new Error(error.message);

  const counts: Record<string, number> = {};
  if (data) {
    for (const row of data) {
      if (Array.isArray(row.selected_categories)) {
        for (const cat of row.selected_categories) {
          // Trim whitespace and normalise case to avoid duplicate entries
          const key = typeof cat === "string" ? cat.trim() : cat;
          if (key) {
            counts[key] = (counts[key] || 0) + 1;
          }
        }
      }
    }
  }

  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getPackages() {
  await requirePermission("manageEmployers");
  const { data, error } = await getSupabase()
    .from("packages")
    .select("*")
    .order("price", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function upsertPackage(
  id: string | null,
  name: string,
  duration_days: number,
  price: number,
  category: "standard" | "premium"
) {
  await requirePermission("manageConfiguration");

  const trimmedName = name.trim();
  if (!trimmedName) throw new Error("Package name is required.");
  if (!Number.isFinite(duration_days) || duration_days <= 0) throw new Error("Duration must be a positive number of days.");
  if (!Number.isFinite(price) || price < 0) throw new Error("Price must be zero or a positive number.");
  if (category !== "standard" && category !== "premium") throw new Error("Invalid package category.");

  const supabase = getSupabase();
  const row = { name: trimmedName, duration_days, price, category };

  if (id) {
    const { error } = await supabase.from("packages").update(row).eq("id", id);
    if (error) throw new Error(error.message);
    await logActivity("update_package", trimmedName, row);
  } else {
    const { error } = await supabase.from("packages").insert(row);
    if (error) throw new Error(error.message);
    await logActivity("create_package", trimmedName, row);
  }

  return { success: true };
}

export async function deletePackage(id: string) {
  await requirePermission("manageConfiguration");

  const supabase = getSupabase();
  const { count, error: countError } = await supabase
    .from("employers")
    .select("id", { count: "exact", head: true })
    .eq("active_package_id", id);
  if (countError) throw new Error(countError.message);
  if (count && count > 0) {
    throw new Error(`Cannot delete: ${count} employer${count === 1 ? " is" : "s are"} currently assigned this package.`);
  }

  const { error } = await supabase.from("packages").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await logActivity("delete_package", id);

  return { success: true };
}

export async function getBusinessTypes() {
  await requirePermission("manageEmployers");
  const { data, error } = await getSupabase()
    .from("business_types")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function addBusinessType(name: string) {
  await requirePermission("manageEmployers");
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Business type name cannot be empty.");

  const supabase = getSupabase();
  const { data: existing, error: existingErr } = await supabase
    .from("business_types")
    .select("*")
    .ilike("name", trimmed)
    .maybeSingle();
  if (existingErr) throw new Error(existingErr.message);
  if (existing) return existing;

  const { data, error } = await supabase
    .from("business_types")
    .insert({ name: trimmed })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// ── Broadcast ────────────────────────────────────────────────────────────────

export async function sendBroadcast(target: "all" | "job_seeker" | "employer", message: string) {
  await requirePermission("manageConfiguration");
  if (!message.trim()) throw new Error("Broadcast message cannot be empty.");

  const supabase = getSupabase();
  let query = supabase.from("users").select("telegram_id");
  if (target !== "all") {
    query = query.eq("role", target);
  }
  const { data: users, error } = await query;
  if (error) throw error;
  if (!users || users.length === 0) return { success: true, sentCount: 0 };

  const rows = users.map((u: any) => ({
    user_telegram_id: u.telegram_id,
    company_name: "Announcement",
    job_title: message.trim(),
    type: "broadcast",
    read: false,
  }));

  const { error: insertError } = await supabase.from("notifications").insert(rows);
  if (insertError) throw insertError;

  await logActivity("send_broadcast", target, { message: message.trim(), sentCount: rows.length });
  return { success: true, sentCount: rows.length };
}

export type BroadcastSummary = {
  message: string;
  created_at: string;
  /** Notification rows this send fanned out to. */
  recipients: number;
  /** Recipients whose Telegram DM hasn't been dispatched yet. */
  pendingDms: number;
  readCount: number;
};

export async function getRecentBroadcasts(limit: number = 20): Promise<BroadcastSummary[]> {
  await requirePermission("manageConfiguration");
  // broadcast_summary collapses the per-recipient fan-out back into one row per
  // announcement (see migration 20260805020000).
  const { data, error } = await getSupabase()
    .from("broadcast_summary")
    .select("message, created_at, recipients, pending_dms, read_count")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data || []).map((row: any) => ({
    message: row.message,
    created_at: row.created_at,
    recipients: row.recipients ?? 0,
    pendingDms: row.pending_dms ?? 0,
    readCount: row.read_count ?? 0,
  }));
}

/** A broadcast is addressed by the pair that groups its rows, not by an id --
 *  every recipient has a row of their own and they share (job_title, created_at).
 *  Passing the original message back guards against editing a stale copy: if
 *  someone else already changed the text, nothing matches and the caller is
 *  told to refresh rather than silently overwriting. */
export async function updateBroadcast(createdAt: string, originalMessage: string, newMessage: string) {
  await requirePermission("manageConfiguration");
  const trimmed = newMessage.trim();
  if (!trimmed) throw new Error("Broadcast message cannot be empty.");

  const { data, error } = await getSupabase()
    .from("notifications")
    .update({ job_title: trimmed })
    .eq("type", "broadcast")
    .eq("created_at", createdAt)
    .eq("job_title", originalMessage)
    .select("id, dm_sent_at");

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("That broadcast no longer exists. Refresh and try again.");
  }

  // Rows already dispatched keep the text their recipient was DM'd -- Telegram
  // messages can't be edited after the fact from here, so only the in-app
  // announcement changes for those people.
  const pendingDms = data.filter((r: any) => !r.dm_sent_at).length;
  await logActivity("edit_broadcast", trimmed, {
    before: originalMessage,
    after: trimmed,
    updatedCount: data.length,
  });

  return { success: true, updatedCount: data.length, alreadyDelivered: data.length - pendingDms };
}

export async function deleteBroadcast(createdAt: string, message: string) {
  await requirePermission("manageConfiguration");

  const { data, error } = await getSupabase()
    .from("notifications")
    .delete()
    .eq("type", "broadcast")
    .eq("created_at", createdAt)
    .eq("job_title", message)
    .select("id, dm_sent_at");

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("That broadcast no longer exists. Refresh and try again.");
  }

  // Deleting an undispatched row also cancels its pending DM -- the dispatcher
  // polls the same rows, so there's nothing left for it to send.
  const cancelledDms = data.filter((r: any) => !r.dm_sent_at).length;
  await logActivity("delete_broadcast", message, { deletedCount: data.length, cancelledDms });

  return { success: true, deletedCount: data.length, cancelledDms };
}

// ── Activity Log ─────────────────────────────────────────────────────────────

export async function getActivityLog(page: number = 1, pageSize: number = 25) {
  await requirePermission("manageConfiguration");
  const supabase = getSupabase();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("activity_log")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw error;
  return { rows: data || [], total: count || 0 };
}

// ── Reporting & Analytics ─────────────────────────────────────────────────────

function bucketByDay(rows: { created_at: string }[], days: number) {
  const buckets: Record<string, number> = {};
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    buckets[d.toISOString().split("T")[0]] = 0;
  }
  for (const row of rows) {
    const day = row.created_at.split("T")[0];
    if (day in buckets) buckets[day]++;
  }
  return Object.entries(buckets).map(([date, count]) => ({ date, count }));
}

// ── Data Export (Agreement §17.E — backup functionality) ─────────────────────

/** Tables an admin may export. Deliberately limited to core business data.
 *  `app_config` is excluded on purpose -- it holds bcrypt password hashes for
 *  the admin and sub-admin accounts, and a CSV of those has no business
 *  landing in someone's Downloads folder. */
const EXPORTABLE_TABLES = {
  users: "id, telegram_id, role, is_banned, created_at",
  profiles: "id, telegram_id, full_name, age, gender, location, phone_number, selected_categories, onboarding_completed, created_at",
  employers: "id, business_name, business_type, status, authorization_number, active_package_id, package_expires_at, daily_post_limit, created_at",
  jobs: "id, employer_id, title, category, location, neighborhood, status, quantity, deadline, created_at",
  applications: "id, job_id, profile_id, telegram_id, status, created_at",
} as const;

export type ExportableTable = keyof typeof EXPORTABLE_TABLES;

/** Serialises one value into a CSV field.
 *
 *  The leading-symbol guard is deliberate: Excel and Sheets execute a cell
 *  starting with = + - or @ as a formula, so a business name like
 *  "=cmd|..." in an exported file becomes a CSV injection attack against
 *  whoever opens it. Prefixing a single quote makes it inert text. */
function toCsvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = Array.isArray(value) ? value.join("; ") : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Exports one table as a CSV string for the admin to download.
 *
 *  Returns the text rather than a file so the browser can trigger the download
 *  without another round trip. Capped because this is a reporting/handover
 *  convenience, not the disaster-recovery path -- that's the nightly dump in
 *  .github/workflows/backup.yml. */
export async function exportTableCsv(
  table: ExportableTable
): Promise<{ success: true; filename: string; csv: string; rowCount: number } | { success: false; error: string }> {
  await requirePermission("manageReports");

  const columns = EXPORTABLE_TABLES[table];
  if (!columns) return { success: false, error: "That table cannot be exported." };

  const { data, error } = await getSupabase()
    .from(table)
    .select(columns)
    .order("created_at", { ascending: false })
    .limit(10000);

  if (error) return { success: false, error: error.message };

  const header = columns.split(",").map((c) => c.trim());
  const lines = [header.join(",")];
  for (const row of (data as any[]) || []) {
    lines.push(header.map((h) => toCsvField(row[h])).join(","));
  }

  await logActivity("export_data", table, { rowCount: data?.length ?? 0 });

  return {
    success: true,
    filename: `jobsaddis_${table}_${new Date().toISOString().split("T")[0]}.csv`,
    // Prepended BOM so Excel opens Amharic names as UTF-8 instead of mojibake.
    csv: "﻿" + lines.join("\r\n"),
    rowCount: data?.length ?? 0,
  };
}

export async function getVacancyReport(days: number = 30) {
  await requirePermission("manageReports");
  const supabase = getSupabase();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data: jobs, error } = await supabase
    .from("jobs")
    .select("status, category, created_at")
    .eq("status", "active")
    .gte("created_at", since.toISOString());
  if (error) throw error;

  const byStatus: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  for (const job of jobs || []) {
    byStatus[job.status] = (byStatus[job.status] || 0) + 1;
    byCategory[job.category] = (byCategory[job.category] || 0) + 1;
  }

  return {
    totalJobs: jobs?.length || 0,
    byStatus: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
    byCategory: Object.entries(byCategory).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count),
    postsPerDay: bucketByDay(jobs || [], days),
  };
}

export async function getApplicationReport(days: number = 30) {
  await requirePermission("manageReports");
  const supabase = getSupabase();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data: applications, error } = await supabase
    .from("applications")
    .select("job_id, status, created_at")
    .gte("created_at", since.toISOString());
  if (error) throw error;

  const perJob: Record<string, number> = {};
  for (const app of applications || []) {
    perJob[app.job_id] = (perJob[app.job_id] || 0) + 1;
  }
  const jobCount = Object.keys(perJob).length;
  const avgPerJob = jobCount > 0 ? (applications || []).length / jobCount : 0;

  return {
    totalApplications: applications?.length || 0,
    applicationsPerDay: bucketByDay(applications || [], days),
    averageApplicationsPerJob: Math.round(avgPerJob * 10) / 10,
  };
}

export async function getUserGrowthReport(days: number = 30) {
  await requirePermission("manageReports");
  const supabase = getSupabase();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data: users, error } = await supabase
    .from("users")
    .select("role, created_at")
    .in("role", ["job_seeker", "employer"])
    .gte("created_at", since.toISOString());
  if (error) throw error;

  const seekers = (users || []).filter((u) => u.role === "job_seeker");
  const employers = (users || []).filter((u) => u.role === "employer");

  return {
    totalSignups: users?.length || 0,
    jobSeekerSignups: seekers.length,
    employerSignups: employers.length,
    signupsPerDay: bucketByDay(users || [], days),
  };
}

export async function getPackagePerformanceReport() {
  await requirePermission("manageReports");
  const supabase = getSupabase();

  const { data: packages, error: pkgError } = await supabase.from("packages").select("id, name, price");
  if (pkgError) throw pkgError;

  const { data: employers, error: empError } = await supabase
    .from("employers")
    .select("active_package_id, package_expires_at");
  if (empError) throw empError;

  const now = new Date();
  const active = (employers || []).filter((e) => e.active_package_id && e.package_expires_at && new Date(e.package_expires_at) > now);

  return (packages || [])
    .map((pkg) => {
      const activeCount = active.filter((e) => e.active_package_id === pkg.id).length;
      return {
        packageId: pkg.id,
        name: pkg.name,
        activeSubscriptions: activeCount,
        currentActiveValue: activeCount * Number(pkg.price),
      };
    })
    .sort((a, b) => b.activeSubscriptions - a.activeSubscriptions);
}
