"use server";

import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { EMPLOYER_UI_COOKIE } from "@/lib/employerUiCookie";
import { signSessionValue, verifySessionValue } from "@/lib/signedSession";

const getSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key";
  return createClient(supabaseUrl, supabaseServiceKey);
};

// ── Multi-account support ────────────────────────────────────────────────
// `employer_session` (below) always holds the *currently active* account, in
// the same flat shape every other page already parses directly. This second
// cookie holds every account that's been logged into in this browser, so a
// switch is just "point employer_session at a different entry" with no
// re-authentication and no disturbing the other files that read
// employer_session inline.
const MAX_AUTH_CODE_ATTEMPTS = 5;
const AUTH_LOCKOUT_MINUTES = 15;
const ACCOUNTS_COOKIE = "employer_accounts";
const SESSION_MAX_AGE = 60 * 60 * 8;
const MAX_ACCOUNTS = 5;

type EmployerAccountSession = {
  employerId: string;
  telegramId: number;
  businessName: string;
  businessType: string;
  logoUrl: string | null;
  status: string;
};

async function readAccounts(): Promise<EmployerAccountSession[]> {
  const raw = (await cookies()).get(ACCOUNTS_COOKIE)?.value;
  let accounts: EmployerAccountSession[] = verifySessionValue(raw) ?? [];
  // Back-compat: an employer already logged in before multi-account support
  // shipped has no employer_accounts cookie yet -- seed it from today's
  // single session so they don't vanish from their own switcher.
  if (accounts.length === 0) {
    const current = await getEmployerSession();
    if (current?.employerId) accounts = [current];
  }
  return accounts;
}

async function writeAccounts(accounts: EmployerAccountSession[]) {
  (await cookies()).set(ACCOUNTS_COOKIE, signSessionValue(accounts.slice(-MAX_ACCOUNTS)), {
    maxAge: SESSION_MAX_AGE,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

async function setActiveSession(account: EmployerAccountSession) {
  (await cookies()).set("employer_session", signSessionValue(account), {
    maxAge: SESSION_MAX_AGE,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

function upsertAccount(accounts: EmployerAccountSession[], account: EmployerAccountSession) {
  return [...accounts.filter((a) => a.employerId !== account.employerId), account];
}

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

  const { data: employer, error: empErr } = await supabase.from("employers").select("id, authorization_number, password_hash, auth_code_attempts, auth_code_locked_until").eq("user_id", user.id).maybeSingle();
  if (empErr) return { success: false, error: `DB error: ${empErr.message}` };
  if (!employer) return { success: false, error: "not_found" };

  if (employer.password_hash) return { success: false, error: "Account already onboarded" };

  // The code is only 5 digits (100,000 combinations) and has no expiry, so
  // without a cap someone who knows a valid Telegram ID could script through
  // every combination. Locks for a fixed window rather than permanently --
  // low-stakes account, no need to route a support request through an admin.
  if (employer.auth_code_locked_until && new Date(employer.auth_code_locked_until) > new Date()) {
    const minutesLeft = Math.ceil((new Date(employer.auth_code_locked_until).getTime() - Date.now()) / 60000);
    return { success: false, error: `Too many incorrect attempts. Please try again in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.` };
  }

  if (employer.authorization_number !== trimmedCode) {
    const nextAttempts = employer.auth_code_attempts + 1;
    if (nextAttempts >= MAX_AUTH_CODE_ATTEMPTS) {
      const lockedUntil = new Date(Date.now() + AUTH_LOCKOUT_MINUTES * 60000).toISOString();
      await supabase.from("employers").update({ auth_code_attempts: 0, auth_code_locked_until: lockedUntil }).eq("id", employer.id);
      return { success: false, error: `Too many incorrect attempts. Please try again in ${AUTH_LOCKOUT_MINUTES} minutes.` };
    }
    await supabase.from("employers").update({ auth_code_attempts: nextAttempts }).eq("id", employer.id);
    return { success: false, error: "Invalid authorization code. Please try again." };
  }

  if (employer.auth_code_attempts > 0 || employer.auth_code_locked_until) {
    await supabase.from("employers").update({ auth_code_attempts: 0, auth_code_locked_until: null }).eq("id", employer.id);
  }

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

  const account: EmployerAccountSession = {
    employerId: employer.id,
    telegramId: id,
    businessName: employer.business_name,
    businessType: employer.business_type,
    logoUrl: employer.logo_url || null,
    status: employer.status,
  };

  await setActiveSession(account);
  await writeAccounts(upsertAccount(await readAccounts(), account));

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

  const account: EmployerAccountSession = {
    employerId: employer.id,
    telegramId: id,
    businessName: employer.business_name,
    businessType: employer.business_type,
    logoUrl: employer.logo_url || null,
    status: employer.status,
  };

  // Adds to (rather than replaces) whichever accounts are already signed in
  // on this browser, so logging into a second employer doesn't sign the
  // first one out -- see the account switcher in EmployerDashboardLayout.
  await setActiveSession(account);
  await writeAccounts(upsertAccount(await readAccounts(), account));

  return { success: true };
}

/** Get the current employer session */
export async function getEmployerSession() {
  const sessionCookie = (await cookies()).get("employer_session");
  return verifySessionValue(sessionCookie?.value);
}

/** Merges the given fields into the current employer_session cookie. Needed
 *  whenever an employer edits data (name/type/logo) that's cached in the
 *  session cookie itself rather than re-fetched from the DB per request —
 *  e.g. the dashboard sidebar reads session.businessName/logoUrl directly. */
export async function refreshEmployerSessionCookie(updates: {
  businessName?: string;
  businessType?: string;
  logoUrl?: string | null;
}) {
  const session = await getEmployerSession();
  if (!session) return;

  const next = { ...session, ...updates };
  (await cookies()).set("employer_session", signSessionValue(next), {
    maxAge: 60 * 60 * 8,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

/** Validate that the employer in the current session still exists in the DB.
 *  Returns { valid: true } or { valid: false, reason: "deleted" | "rejected" }.
 *  A lapsed subscription does NOT invalidate the session — an expired employer
 *  keeps full dashboard access; only creating new job listings is blocked
 *  (enforced in emp/dashboard/jobs/actions.ts), not the dashboard itself. */
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

/** Logout employer -- signs out of every saved account on this browser, not
 *  just the active one. For signing out of a single account while staying
 *  logged into others, see removeEmployerAccount. */
export async function logoutEmployer() {
  const jar = await cookies();
  jar.delete("employer_session");
  jar.delete(ACCOUNTS_COOKIE);
  // Don't leave one employer's saved sub-tab position for the next login.
  jar.delete(EMPLOYER_UI_COOKIE);
}

/** All accounts signed into this browser, plus which one is active -- for
 *  the account switcher in EmployerDashboardLayout. */
export async function getEmployerAccounts() {
  const accounts = await readAccounts();
  const current = await getEmployerSession();
  return { accounts, activeEmployerId: current?.employerId ?? null };
}

/** Flips the active session to an already-signed-in account -- no
 *  re-authentication, matching a browser-style account switcher. Re-checks
 *  the account is still valid so a switch never lands on one that's since
 *  been deleted, rejected, or banned. */
export async function switchEmployerAccount(employerId: string) {
  const accounts = await readAccounts();
  const target = accounts.find((a) => a.employerId === employerId);
  if (!target) return { success: false, error: "Account not found. Please log in again." };

  const supabase = getSupabase();
  const { data: employer } = await supabase
    .from("employers")
    .select("id, business_name, business_type, status, logo_url, users(is_banned)")
    .eq("id", employerId)
    .maybeSingle();

  const isBanned = Array.isArray(employer?.users) ? (employer as any).users[0]?.is_banned : (employer as any)?.users?.is_banned;
  if (!employer || employer.status === "rejected" || isBanned) {
    await writeAccounts(accounts.filter((a) => a.employerId !== employerId));
    return { success: false, error: "This account is no longer available." };
  }

  const refreshed: EmployerAccountSession = {
    employerId: employer.id,
    telegramId: target.telegramId,
    businessName: employer.business_name,
    businessType: employer.business_type,
    logoUrl: employer.logo_url || null,
    status: employer.status,
  };

  await setActiveSession(refreshed);
  await writeAccounts(upsertAccount(accounts, refreshed));
  // Don't carry Account A's last-open sub-tab into Account B's dashboard.
  (await cookies()).delete(EMPLOYER_UI_COOKIE);

  return { success: true };
}

/** Signs out of a single saved account without touching the others. If the
 *  removed account was the active one, falls back to another saved account;
 *  if it was the last one, this is equivalent to a full logoutEmployer(). */
export async function removeEmployerAccount(employerId: string) {
  const accounts = await readAccounts();
  const remaining = accounts.filter((a) => a.employerId !== employerId);
  const current = await getEmployerSession();
  const jar = await cookies();

  if (remaining.length === 0) {
    jar.delete("employer_session");
    jar.delete(ACCOUNTS_COOKIE);
    jar.delete(EMPLOYER_UI_COOKIE);
    return { success: true, loggedOut: true as const };
  }

  await writeAccounts(remaining);
  if (current?.employerId === employerId) {
    await setActiveSession(remaining[0]);
    jar.delete(EMPLOYER_UI_COOKIE);
    return { success: true, loggedOut: false as const, switchedTo: remaining[0] };
  }
  return { success: true, loggedOut: false as const };
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

export async function requestEmployerRenewal(employerId: string) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("employers")
    .update({ renewal_requested: true, renewal_requested_at: new Date().toISOString(), renewal_seen_at: null })
    .eq("id", employerId);
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function getEmployerNotifications() {
  const session = await getEmployerSession();
  if (!session) return [];

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_telegram_id", session.telegramId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function markNotificationAsRead(id: string) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", id);
  if (error) throw new Error(error.message);
  return { success: true };
}
