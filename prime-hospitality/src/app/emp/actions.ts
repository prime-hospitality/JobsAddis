"use server";

import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

const getSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key";
  return createClient(supabaseUrl, supabaseServiceKey);
};

/** Check if a Telegram ID belongs to a registered employer */
export async function checkEmployerByTelegramId(telegramId: string) {
  const id = parseInt(telegramId, 10);
  if (isNaN(id)) return { exists: false };

  const supabase = getSupabase();
  const { data: user } = await supabase
    .from("users")
    .select("id, role")
    .eq("telegram_id", id)
    .maybeSingle();

  if (!user || user.role !== "employer") return { exists: false };

  const { data: employer } = await supabase
    .from("employers")
    .select("id, business_name, business_type, status, logo_url, password_hash")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!employer) return { exists: false };

  return { exists: true, employer, has_password: !!employer.password_hash };
}

/** Verify authorization number before setup */
export async function verifyEmployerAuthCode(telegramId: string, authNumber: string) {
  const id = parseInt(telegramId, 10);
  if (isNaN(id)) return { success: false, error: "Invalid Telegram ID" };

  const trimmedCode = authNumber.trim();
  if (!/^\d{5}$/.test(trimmedCode)) {
    return { success: false, error: "Authorization code must be exactly 5 digits" };
  }

  const supabase = getSupabase();

  const { data: user } = await supabase
    .from("users")
    .select("id, role, is_banned")
    .eq("telegram_id", id)
    .maybeSingle();

  if (!user || user.role !== "employer") return { success: false, error: "Not a registered employer" };
  if (user.is_banned) return { success: false, error: "This account has been banned. Please contact support." };

  const { data: employerStatusCheck, error: statusErr } = await supabase.from("employers").select("status").eq("user_id", user.id).maybeSingle();
  if (statusErr) return { success: false, error: `DB error: ${statusErr.message}` };
  if (employerStatusCheck?.status === "rejected") return { success: false, error: "rejected" };

  const { data: employer, error: empErr } = await supabase.from("employers").select("authorization_number, password_hash").eq("user_id", user.id).maybeSingle();
  if (empErr) return { success: false, error: `DB error: ${empErr.message}` };
  if (!employer) return { success: false, error: "not_found" };

  if (employer.password_hash) return { success: false, error: "Account already onboarded" };
  if (employer.authorization_number !== trimmedCode) return { success: false, error: "Invalid authorization code. Please try again." };

  return { success: true };
}

/** Setup password and login */
export async function setupEmployerPassword(telegramId: string, authNumber: string, password: string) {
  const verify = await verifyEmployerAuthCode(telegramId, authNumber);
  if (!verify.success) return verify;

  if (password.length < 6) return { success: false, error: "Password must be at least 6 characters" };

  const supabase = getSupabase();
  const id = parseInt(telegramId, 10);
  const { data: user } = await supabase.from("users").select("id").eq("telegram_id", id).single();

  const passwordHash = await bcrypt.hash(password, 10);

  const { data: employer, error: updateError } = await supabase
    .from("employers")
    .update({ password_hash: passwordHash, authorization_number: null })
    .eq("user_id", user!.id)
    .select("id, business_name, business_type, status, logo_url")
    .single();

  if (updateError || !employer) return { success: false, error: "Failed to setup password" };

  const sessionData = JSON.stringify({
    employerId: employer.id,
    telegramId: id,
    businessName: employer.business_name,
    businessType: employer.business_type,
    logoUrl: employer.logo_url || null,
    status: employer.status,
  });

  (await cookies()).set("employer_session", sessionData, { maxAge: 60 * 60 * 8, httpOnly: true, secure: process.env.NODE_ENV === "production", path: "/" });

  return { success: true };
}

/** Login returning employer with password */
export async function loginWithPassword(telegramId: string, password: string) {
  const id = parseInt(telegramId, 10);
  if (isNaN(id)) return { success: false, error: "Invalid Telegram ID" };

  const supabase = getSupabase();

  const { data: user } = await supabase
    .from("users")
    .select("id, role, is_banned")
    .eq("telegram_id", id)
    .maybeSingle();

  if (!user || user.role !== "employer") return { success: false, error: "Not a registered employer" };
  if (user.is_banned) return { success: false, error: "This account has been banned. Please contact support." };

  const { data: employerStatusCheck } = await supabase.from("employers").select("status").eq("user_id", user.id).maybeSingle();
  if (employerStatusCheck?.status === "rejected") return { success: false, error: "rejected" };

  const { data: employer } = await supabase
    .from("employers")
    .select("id, business_name, business_type, status, logo_url, password_hash")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!employer) return { success: false, error: "not_found" };
  if (!employer.password_hash) return { success: false, error: "Account not onboarded yet" };

  const isValid = await bcrypt.compare(password, employer.password_hash);
  if (!isValid) return { success: false, error: "Invalid password" };

  const sessionData = JSON.stringify({
    employerId: employer.id,
    telegramId: id,
    businessName: employer.business_name,
    businessType: employer.business_type,
    logoUrl: employer.logo_url || null,
    status: employer.status,
  });

  (await cookies()).set("employer_session", sessionData, { maxAge: 60 * 60 * 8, httpOnly: true, secure: process.env.NODE_ENV === "production", path: "/" });

  return { success: true };
}

/** Get the current employer session */
export async function getEmployerSession() {
  const sessionCookie = (await cookies()).get("employer_session");
  if (!sessionCookie?.value) return null;
  try {
    return JSON.parse(sessionCookie.value);
  } catch {
    return null;
  }
}

/** Validate that the employer in the current session still exists in the DB.
 *  Returns { valid: true } or { valid: false, reason: "deleted" | "rejected" } */
export async function validateEmployerSession() {
  const session = await getEmployerSession();
  if (!session?.employerId) return { valid: false, reason: "deleted" as const };

  const supabase = getSupabase();
  const { data: employer } = await supabase
    .from("employers")
    .select("id, status")
    .eq("id", session.employerId)
    .maybeSingle();

  if (!employer) return { valid: false, reason: "deleted" as const };
  if (employer.status === "rejected") return { valid: false, reason: "rejected" as const };
  return { valid: true };
}

/** Logout employer */
export async function logoutEmployer() {
  (await cookies()).delete("employer_session");
}

/** Get employer full data for dashboard */
export async function getEmployerDashboardData() {
  const session = await getEmployerSession();
  if (!session) return null;

  const supabase = getSupabase();

  const { data: jobs } = await supabase
    .from("jobs")
    .select("*, applications(id, status, created_at, profiles(full_name, telegram_id, phone_number))")
    .eq("employer_id", session.employerId)
    .order("created_at", { ascending: false });

  const allJobs = jobs || [];
  const activeJobs = allJobs.filter((j: any) => j.status === "active");
  const allApplications = allJobs.flatMap((j: any) => j.applications || []);
  const pendingApplications = allApplications.filter((a: any) => a.status === "pending");

  // Recent applications (last 10)
  const recentApplications = allApplications
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  return {
    session,
    jobs: allJobs,
    activeJobs,
    totalApplications: allApplications.length,
    pendingApplications: pendingApplications.length,
    recentApplications,
  };
}
