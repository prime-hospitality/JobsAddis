"use server";

import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { verifyConfigPassword, setConfigPassword } from "@/lib/appConfigPassword";

const getSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key";
  return createClient(supabaseUrl, supabaseServiceKey);
};

const verifyIdpAuth = async () => {
  const auth = (await cookies()).get("idp_session");
  if (!auth?.value) throw new Error("Unauthorized");
};

// ── Auth ─────────────────────────────────────────────────────────────
// IDP used to share the /admin dashboard's password outright -- anyone with
// one had the other. It now has its own separate app_config credential
// (idp_password), managed below.

export async function loginIdp(password: string) {
  const ok = await verifyConfigPassword("idp_password", password, process.env.IDP_PASSWORD || "changeme-idp");
  if (ok) {
    (await cookies()).set("idp_session", "true", { maxAge: 60 * 60 * 24, httpOnly: true, secure: process.env.NODE_ENV === "production" });
    return { success: true };
  }
  return { success: false, error: "Invalid password" };
}

/** Change the IDP portal's own password (separate from the /admin password). */
export async function changeIdpPassword(newPassword: string) {
  await verifyIdpAuth();
  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: "Password must be at least 6 characters." };
  }
  await setConfigPassword("idp_password", newPassword);
  return { success: true };
}

export async function logoutIdp() {
  (await cookies()).delete("idp_session");
}

// ── Telemetry ─────────────────────────────────────────────────────────

export async function getIdpData() {
  await verifyIdpAuth();
  const supabase = getSupabase();

  const { data: users, error } = await supabase
    .from("users")
    .select("id, telegram_id, role, created_at, is_banned, device_performance, profiles(full_name, gender)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("IDP Error fetching users:", error);
    throw new Error("Failed to fetch user telemetry");
  }

  const totalUsers = users?.length || 0;
  const highEnd = users?.filter(u => u.device_performance === "high").length || 0;
  const midEnd = users?.filter(u => u.device_performance === "medium" || !u.device_performance).length || 0;
  const lowEnd = users?.filter(u => u.device_performance === "low").length || 0;

  return {
    users: users ?? [],
    stats: {
      totalUsers,
      performanceBreakdown: { high: highEnd, medium: midEnd, low: lowEnd }
    }
  };
}

// ── Admin Credential Management ──────────────────────────────────────

/** Get current admin username (for display) */
export async function getAdminUsername(): Promise<string> {
  await verifyIdpAuth();
  const supabase = getSupabase();
  const { data } = await supabase.from("app_config").select("value").eq("key", "admin_username").single();
  return data?.value?.trim() || "admin";
}

/** Change the admin dashboard username */
export async function changeAdminUsername(newUsername: string) {
  await verifyIdpAuth();
  if (!newUsername || newUsername.trim().length < 3) {
    return { success: false, error: "Username must be at least 3 characters." };
  }
  const supabase = getSupabase();
  const { error } = await supabase
    .from("app_config")
    .upsert({ key: "admin_username", value: newUsername.trim(), updated_at: new Date().toISOString() });
  if (error) return { success: false, error: "Failed to update username." };
  return { success: true };
}

/** Change the admin dashboard password */
export async function changeAdminPassword(newPassword: string) {
  await verifyIdpAuth();
  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: "Password must be at least 6 characters." };
  }
  await setConfigPassword("admin_password", newPassword);
  return { success: true };
}

// ── Admin Login Lockouts ────────────────────────────────────────────────
// /admin locks a username out for 15 minutes after 5 failed attempts (see
// loginAdmin in admin/actions.ts). This is the self-service escape hatch --
// gated behind this separate IDP password rather than exposed on the public
// /admin login page, since anything reachable from there would just become
// a second thing to brute-force.

export async function getAdminLockouts() {
  await verifyIdpAuth();
  const supabase = getSupabase();
  const { data } = await supabase
    .from("admin_login_attempts")
    .select("username, failed_attempts, locked_until")
    .order("locked_until", { ascending: false });
  return data ?? [];
}

export async function clearAdminLoginLockout(username: string) {
  await verifyIdpAuth();
  const supabase = getSupabase();
  const { error } = await supabase.from("admin_login_attempts").delete().eq("username", username);
  if (error) return { success: false, error: "Failed to clear lockout." };
  return { success: true };
}
