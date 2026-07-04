"use server";

import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const getSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key";
  return createClient(supabaseUrl, supabaseServiceKey);
};

export async function loginIdp(password: string) {
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  if (password === adminPassword) {
    (await cookies()).set("idp_session", "true", { maxAge: 60 * 60 * 24, httpOnly: true, secure: process.env.NODE_ENV === "production" });
    return { success: true };
  }
  return { success: false, error: "Invalid password" };
}

export async function logoutIdp() {
  (await cookies()).delete("idp_session");
}

export async function getIdpData() {
  const auth = (await cookies()).get("idp_session");
  if (!auth?.value) throw new Error("Unauthorized");

  // Fetch all users for telemetry analysis
  // Note: relies on the database having a 'device_performance' column
  const { data: users, error } = await getSupabase()
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
