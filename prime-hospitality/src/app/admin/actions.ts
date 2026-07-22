"use server";

import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const getSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key";
  return createClient(supabaseUrl, supabaseServiceKey);
};

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

// ── Session helpers ─────────────────────────────────────────────────────────
async function getSession() {
  const cookie = (await cookies()).get("admin_session");
  if (!cookie?.value) return null;
  try { return JSON.parse(cookie.value); } catch { return null; }
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

  // Check super admin first
  const { data: uCfg } = await supabase.from("app_config").select("value").eq("key", "admin_username").single();
  const storedUsername = uCfg?.value?.trim() || "admin";
  const { data: pCfg } = await supabase.from("app_config").select("value").eq("key", "admin_password").single();
  const storedPassword = pCfg?.value?.trim() || process.env.ADMIN_PASSWORD || "admin123";

  if (username.toLowerCase() === storedUsername.toLowerCase() && password === storedPassword) {
    const sessionData = JSON.stringify({ username: storedUsername, role: "super_admin" });
    (await cookies()).set("admin_session", sessionData, { maxAge: 60 * 60 * 24, httpOnly: true, secure: process.env.NODE_ENV === "production" });
    return { success: true, role: "super_admin" };
  }

  // Check sub-admins
  const subs = await getSubAdmins();
  const sub = subs.find((s) => s.username.toLowerCase() === username.toLowerCase() && s.password === password);
  if (sub) {
    const sessionData = JSON.stringify({ username: sub.username, role: "sub_admin" });
    (await cookies()).set("admin_session", sessionData, { maxAge: 60 * 60 * 24, httpOnly: true, secure: process.env.NODE_ENV === "production" });
    return { success: true, role: "sub_admin" };
  }

  return { success: false, error: "Invalid username or password" };
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
    password: password.trim(),
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

  const supabase = getSupabase();
  const { data: pCfg } = await supabase.from("app_config").select("value").eq("key", "admin_password").single();
  const storedPassword = pCfg?.value?.trim() || process.env.ADMIN_PASSWORD || "admin123";
  if (passwordAttempt !== storedPassword) return { success: false, error: "Incorrect admin password" };

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
  (await cookies()).delete("admin_session");
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
    .select("*, users(telegram_id, role)", { count: "exact" });

  if (queryBusinessName && queryBusinessName.trim()) {
    query = query.ilike("business_name", `%${queryBusinessName.trim()}%`);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);

  const employers = (data || []).filter((e: any) => e.users?.role !== "admin");

  return {
    employers,
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
  if (admin.role === "super_admin") {
    const supabase = getSupabase();
    const { data: pCfg } = await supabase.from("app_config").select("value").eq("key", "admin_password").single();
    const storedPassword = pCfg?.value?.trim() || process.env.ADMIN_PASSWORD || "admin123";
    if (passwordAttempt !== storedPassword) return { success: false, error: "Incorrect admin password" };
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
  const { data: pCfg } = await supabase.from("app_config").select("value").eq("key", "admin_password").single();
  const storedPassword = pCfg?.value?.trim() || process.env.ADMIN_PASSWORD || "admin123";
  if (passwordAttempt !== storedPassword) return { success: false, error: "Incorrect admin password" };


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
  if (profile?.cv_url) {
    const parts = profile.cv_url.split("/resumes/");
    if (parts.length === 2) {
      const path = parts[1];
      // Fire and forget deletion, or await it
      await supabase.storage.from("resumes").remove([path]);
    }
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

export async function toggleJobStatus(jobId: string, status: "active" | "closed" | "pending" | "scheduled") {
  await requirePermission("manageJobs");

  const { error } = await getSupabase().from("jobs").update({ status }).eq("id", jobId);
  if (error) throw error;
  await logActivity("change_job_status", jobId, { status });
  return { success: true };
}

export async function repostJob(jobId: string, newDeadline: string) {
  await requirePermission("manageJobs");

  const supabase = getSupabase();
  const { data: original, error: fetchError } = await supabase
    .from("jobs")
    .select("employer_id, title, category, location, neighborhood, job_type, salary_min, salary_max, currency, description, full_description, requirements, quantity")
    .eq("id", jobId)
    .single();

  if (fetchError || !original) throw fetchError || new Error("Job not found");

  const { data: reposted, error: insertError } = await supabase
    .from("jobs")
    .insert({
      ...original,
      deadline: newDeadline,
      status: "active",
    })
    .select("id")
    .single();

  if (insertError) throw insertError;
  await logActivity("repost_job", jobId, { newJobId: reposted?.id, newDeadline });
  return { success: true, newJobId: reposted?.id };
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


export async function checkTemplateStatus(templateId: string) {
  const auth = (await cookies()).get("admin_session");
  if (!auth?.value) throw new Error("Unauthorized");

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

export async function postJobFromTemplate(templateId: string) {
  const auth = (await cookies()).get("admin_session");
  if (!auth?.value) return { success: false, error: "Unauthorized" };

  const supabase = getSupabase();

  // Fetch the template
  const { data: tpl, error: tplErr } = await supabase
    .from("vacancy_templates")
    .select("*")
    .eq("id", templateId)
    .single();
  if (tplErr || !tpl) return { success: false, error: "Template not found" };

  // Build the full description
  const formatList = (txt: string) =>
    txt.split("\n").filter((l: string) => l.trim()).map((l: string) => l.trim().match(/^[-•*]/) ? l : `• ${l.trim()}`).join("\n");

  let description = tpl.description_template || "";
  if (tpl.responsibilities_template) description += "\n\nResponsibilities:\n" + formatList(tpl.responsibilities_template);
  if (tpl.requirements_template) description += "\n\nRequirements:\n" + formatList(tpl.requirements_template);
  if (tpl.benefits_template) description += "\n\nBenefits:\n" + formatList(tpl.benefits_template);

  // Resolve salary fields
  let salaryMin: number;
  let salaryMax: number;
  if (tpl.salary_type === "negotiable") {
    salaryMin = -1; salaryMax = -1;
  } else if (tpl.salary_type === "company_scale") {
    salaryMin = -2; salaryMax = -2;
  } else {
    salaryMin = tpl.salary_min ?? 0;
    salaryMax = tpl.salary_max ?? tpl.salary_min ?? 0;
  }

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
    salary_min: salaryMin,
    salary_max: salaryMax,
    currency: tpl.salary_currency || "ETB",
    description: description,
    full_description: description,
    requirements: {
      experience: tpl.experience_required || "Entry Level",
      education: tpl.education_requirements || "",
      languages: [],
      locationPreference: null,
      workingHours: null,
    },
    deadline: tpl.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    quantity: tpl.quantity || 1,
    status: "active",
  });

  if (jobErr) return { success: false, error: jobErr.message || "Failed to insert job" };
  return { success: true };
}

export async function scheduleJobFromTemplate(templateId: string, scheduledAt: string) {
  const auth = (await cookies()).get("admin_session");
  if (!auth?.value) return { success: false, error: "Unauthorized" };

  const supabase = getSupabase();
  const { data: tpl, error: tplErr } = await supabase
    .from("vacancy_templates")
    .select("*")
    .eq("id", templateId)
    .single();
  if (tplErr || !tpl) return { success: false, error: "Template not found" };

  const formatList = (txt: string) =>
    txt.split("\n").filter((l: string) => l.trim()).map((l: string) => l.trim().match(/^[-•*]/) ? l : `• ${l.trim()}`).join("\n");

  let description = tpl.description_template || "";
  if (tpl.responsibilities_template) description += "\n\nResponsibilities:\n" + formatList(tpl.responsibilities_template);
  if (tpl.requirements_template) description += "\n\nRequirements:\n" + formatList(tpl.requirements_template);
  if (tpl.benefits_template) description += "\n\nBenefits:\n" + formatList(tpl.benefits_template);

  let salaryMin: number;
  let salaryMax: number;
  if (tpl.salary_type === "negotiable") {
    salaryMin = -1; salaryMax = -1;
  } else if (tpl.salary_type === "company_scale") {
    salaryMin = -2; salaryMax = -2;
  } else {
    salaryMin = tpl.salary_min ?? 0;
    salaryMax = tpl.salary_max ?? tpl.salary_min ?? 0;
  }

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
    salary_min: salaryMin,
    salary_max: salaryMax,
    currency: tpl.salary_currency || "ETB",
    description: description,
    full_description: description,
    requirements: {
      experience: tpl.experience_required || "Entry Level",
      education: tpl.education_requirements || "",
      languages: [],
      locationPreference: null,
      workingHours: null,
    },
    deadline: tpl.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    quantity: tpl.quantity || 1,
    status: "scheduled",
    scheduled_at: scheduledAt,
  });

  if (jobErr) return { success: false, error: jobErr.message || "Failed to insert scheduled job" };
  return { success: true };
}

export async function addEmployer(telegramId: number, businessName: string, businessType: string, packageId: string | null = null) {
  await requirePermission("manageEmployers");

  // Validate telegramId format (positive integer, 5-12 digits, no leading 0)
  const tgIdStr = telegramId.toString();
  if (!/^[1-9][0-9]{4,11}$/.test(tgIdStr)) {
    throw new Error("Telegram ID must be a valid number between 5 and 12 digits, and cannot start with 0.");
  }

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

export async function updateEmployer(employerId: string, businessName: string, businessType: string, dailyPostLimit: number, packageId?: string | null, extendDays: number = 0) {
  await requirePermission("manageEmployers");

  if (!businessName.trim()) throw new Error("Business name cannot be empty.");
  if (![3, 5, -1].includes(dailyPostLimit)) throw new Error("Invalid post limit value.");

  const supabase = getSupabase();
  const updateFields: any = {
    business_name: businessName.trim(),
    business_type: businessType.trim(),
    daily_post_limit: dailyPostLimit,
  };

  if (packageId !== undefined) {
    if (packageId === null || packageId === "") {
      updateFields.active_package_id = null;
      updateFields.package_expires_at = null;
    } else {
      const { data: pkg, error: pkgErr } = await supabase
        .from("packages")
        .select("duration_days")
        .eq("id", packageId)
        .maybeSingle();
      if (pkgErr) throw pkgErr;
      if (pkg) {
        const now = new Date();
        now.setDate(now.getDate() + pkg.duration_days + extendDays);
        updateFields.active_package_id = packageId;
        updateFields.package_expires_at = now.toISOString();
        updateFields.renewal_requested = false;
      }
    }
  }

  const { data, error } = await supabase
    .from("employers")
    .update(updateFields)
    .eq("id", employerId)
    .select("*, users(telegram_id)")
    .single();

  if (error) throw error;
  if (packageId !== undefined) {
    await logActivity("assign_package", employerId, { packageId, extendDays });
  }
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
  const { data: pCfg } = await supabase.from("app_config").select("value").eq("key", "admin_password").single();
  const storedPassword = pCfg?.value?.trim() || process.env.ADMIN_PASSWORD || "admin123";
  if (passwordAttempt !== storedPassword) return { success: false, error: "Incorrect admin password" };


  // 1. Fetch employer to get the logo URL before deletion
  const { data: employer } = await supabase
    .from("employers")
    .select("logo_url")
    .eq("id", employerId)
    .single();

  // 2. Delete the employer
  const { error } = await supabase.from("employers").delete().eq("id", employerId);
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

  if (admin.role === "super_admin") {
    const supabase = getSupabase();
    const { data: pCfg } = await supabase.from("app_config").select("value").eq("key", "admin_password").single();
    const storedPassword = pCfg?.value?.trim() || process.env.ADMIN_PASSWORD || "admin123";
    if (passwordAttempt !== storedPassword) return { success: false, error: "Incorrect admin password" };
  }

  const supabase = getSupabase();

  // 1. Fetch old job seeker profile (if any) to get the stale CV URL
  const { data: oldProfile } = await supabase
    .from("profiles")
    .select("cv_url")
    .eq("user_id", userId)
    .maybeSingle();

  // 2. Delete the old CV from storage if it exists — free up space
  if (oldProfile?.cv_url) {
    const parts = oldProfile.cv_url.split("/resumes/");
    if (parts.length === 2) {
      await supabase.storage.from("resumes").remove([parts[1]]);
    }
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

// ── Content Management ────────────────────────────────────────────────────────

export async function getContentData() {
  const auth = (await cookies()).get("admin_session");
  if (!auth?.value) throw new Error("Unauthorized");

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
  const auth = (await cookies()).get("admin_session");
  if (!auth?.value) throw new Error("Unauthorized");

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
  const auth = (await cookies()).get("admin_session");
  if (!auth?.value) throw new Error("Unauthorized");

  const { error } = await getSupabase().from("faqs").delete().eq("id", id);
  if (error) throw error;
  return { success: true };
}


export interface VacancyTemplatePayload {
  id?: string | null;
  title: string;
  job_category: string;
  description_template: string;
  requirements_template: string;
  location: string;
  employment_type: string;
  salary_type: string;
  salary_min: number | null;
  salary_max?: number | null;
  salary_currency?: string;
  salary_period?: string;
  experience_required?: string;
  responsibilities_template?: string;
  benefits_template?: string;
  deadline?: string;
  quantity?: number;
  education_requirements?: string;
}

export async function upsertVacancyTemplate(payload: VacancyTemplatePayload) {
  const auth = (await cookies()).get("admin_session");
  if (!auth?.value) throw new Error("Unauthorized");

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
    salary_currency: data.salary_currency,
    salary_period: data.salary_period,
    experience_required: data.experience_required,
    responsibilities_template: data.responsibilities_template,
    benefits_template: data.benefits_template,
    deadline: data.deadline || null,
    quantity: data.quantity || 1,
    education_requirements: data.education_requirements || null,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase.from("vacancy_templates").upsert(dbPayload);

  if (error) throw error;
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

export async function getRecentBroadcasts(limit: number = 20) {
  await requirePermission("manageConfiguration");
  const { data, error } = await getSupabase()
    .from("notifications")
    .select("job_title, created_at")
    .eq("type", "broadcast")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;

  // De-duplicate rows that were fanned out to many recipients from the same send.
  const seen = new Set<string>();
  const unique: { message: string; created_at: string }[] = [];
  for (const row of data || []) {
    const key = `${row.job_title}__${row.created_at}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push({ message: row.job_title, created_at: row.created_at });
    }
    if (unique.length >= limit) break;
  }
  return unique;
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
        currentActiveValue: activeCount * pkg.price,
      };
    })
    .sort((a, b) => b.activeSubscriptions - a.activeSubscriptions);
}
