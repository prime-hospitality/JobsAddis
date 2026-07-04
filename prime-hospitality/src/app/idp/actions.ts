"use server";

import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const getSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key";
  return createClient(supabaseUrl, supabaseServiceKey);
};

const verifyIdpAuth = async () => {
  const auth = (await cookies()).get("idp_session");
  if (!auth?.value) throw new Error("Unauthorized");
};

export async function loginIdp(password: string) {
  const supabase = getSupabase();

  // Check app_config for overridden password first
  const { data: config } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", "admin_password")
    .single();

  const storedPassword = config?.value && config.value.trim() !== ""
    ? config.value
    : (process.env.ADMIN_PASSWORD || "admin123");

  if (password === storedPassword) {
    (await cookies()).set("idp_session", "true", { maxAge: 60 * 60 * 24, httpOnly: true, secure: process.env.NODE_ENV === "production" });
    return { success: true };
  }
  return { success: false, error: "Invalid password" };
}

export async function logoutIdp() {
  (await cookies()).delete("idp_session");
}

export async function getIdpData() {
  await verifyIdpAuth();
  const supabase = getSupabase();

  // Fetch all users for telemetry analysis
  const { data: users, error } = await supabase
    .from("users")
    .select("id, telegram_id, role, created_at, is_banned, device_performance, profiles(full_name, gender)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("IDP Error fetching users:", error);
    throw new Error("Failed to fetch user telemetry");
  }

  // Calculate some basic stats
  const totalUsers = users?.length || 0;
  const highEnd = users?.filter(u => u.device_performance === "high").length || 0;
  const midEnd = users?.filter(u => u.device_performance === "medium" || !u.device_performance).length || 0;
  const lowEnd = users?.filter(u => u.device_performance === "low").length || 0;

  return {
    users: users ?? [],
    stats: {
      totalUsers,
      performanceBreakdown: {
        high: highEnd,
        medium: midEnd,
        low: lowEnd
      }
    }
  };
}

// ── Password Management ──────────────────────────────────────────────

/** Get current admin password (masked) and the source it came from */
export async function getAdminPasswordInfo() {
  await verifyIdpAuth();
  const supabase = getSupabase();

  const { data: config } = await supabase
    .from("app_config")
    .select("value, updated_at")
    .eq("key", "admin_password")
    .single();

  const isDbOverridden = !!(config?.value && config.value.trim() !== "");
  return {
    source: isDbOverridden ? "database" : "environment",
    updatedAt: config?.updated_at || null,
  };
}

/** Change the admin password (stored in app_config table) */
export async function changeAdminPassword(currentPassword: string, newPassword: string) {
  await verifyIdpAuth();

  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: "New password must be at least 6 characters." };
  }

  const supabase = getSupabase();

  // Verify the current password first
  const { data: config } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", "admin_password")
    .single();

  const activePassword = config?.value && config.value.trim() !== ""
    ? config.value
    : (process.env.ADMIN_PASSWORD || "admin123");

  if (currentPassword !== activePassword) {
    return { success: false, error: "Current password is incorrect." };
  }

  // Upsert new password into app_config
  const { error } = await supabase
    .from("app_config")
    .upsert({ key: "admin_password", value: newPassword, updated_at: new Date().toISOString() });

  if (error) return { success: false, error: "Failed to update password." };

  return { success: true };
}

/** Get all users with their basic info for password management */
export async function getManagedUsers() {
  await verifyIdpAuth();
  const supabase = getSupabase();

  const { data: users, error } = await supabase
    .from("users")
    .select("id, telegram_id, role, created_at, is_banned, profiles(full_name)")
    .order("created_at", { ascending: false });

  if (error) throw new Error("Failed to fetch users");
  return users ?? [];
}

/** Reset/set a user's password override (stored in app_config as user:<id>:password) */
export async function setUserPasswordOverride(userId: string, newPassword: string) {
  await verifyIdpAuth();

  if (!newPassword || newPassword.length < 4) {
    return { success: false, error: "Password must be at least 4 characters." };
  }

  const supabase = getSupabase();
  const key = `user:${userId}:password`;

  const { error } = await supabase
    .from("app_config")
    .upsert({ key, value: newPassword, updated_at: new Date().toISOString() });

  if (error) return { success: false, error: "Failed to set user password." };
  return { success: true };
}

/** Get user password overrides (returns list of userIds that have overrides) */
export async function getUserPasswordOverrides() {
  await verifyIdpAuth();
  const supabase = getSupabase();

  const { data } = await supabase
    .from("app_config")
    .select("key, value, updated_at")
    .like("key", "user:%:password");

  return (data ?? []).map(row => ({
    userId: row.key.split(":")[1],
    updatedAt: row.updated_at,
  }));
}
