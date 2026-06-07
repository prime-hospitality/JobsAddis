"use server";

import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const getSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key";
  return createClient(supabaseUrl, supabaseServiceKey);
};

export async function loginAdmin(password: string) {
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  if (password === adminPassword) {
    // Set cookie for 24 hours
    (await cookies()).set("admin_session", "true", { maxAge: 60 * 60 * 24, httpOnly: true, secure: process.env.NODE_ENV === "production" });
    return { success: true };
  }
  return { success: false, error: "Invalid password" };
}

export async function logoutAdmin() {
  (await cookies()).delete("admin_session");
}

export async function getAdminData() {
  // Verify auth
  const auth = (await cookies()).get("admin_session");
  if (!auth?.value) throw new Error("Unauthorized");

  // Fetch all employers
  const { data: employers } = await getSupabase()
    .from("employers")
    .select("*, users(telegram_id)")
    .order("created_at", { ascending: false });

  // Fetch all jobs
  const { data: jobs } = await getSupabase()
    .from("jobs")
    .select("*, employers(business_name)")
    .order("created_at", { ascending: false });

  // Fetch all users (excluding employers)
  const { data: users } = await getSupabase()
    .from("users")
    .select("*, profiles(full_name)")
    .neq("role", "employer")
    .order("created_at", { ascending: false });

  return {
    employers: employers ?? [],
    jobs: jobs ?? [],
    users: users ?? [],
  };
}

export async function approveEmployer(employerId: string) {
  const auth = (await cookies()).get("admin_session");
  if (!auth?.value) throw new Error("Unauthorized");

  const { error } = await getSupabase().from("employers").update({ status: "approved" }).eq("id", employerId);
  if (error) throw error;
  return { success: true };
}

export async function rejectEmployer(employerId: string) {
  const auth = (await cookies()).get("admin_session");
  if (!auth?.value) throw new Error("Unauthorized");

  const { error } = await getSupabase().from("employers").update({ status: "rejected" }).eq("id", employerId);
  if (error) throw error;
  return { success: true };
}

export async function adminUpdateEmployerLogo(employerId: string, logoUrl: string) {
  const auth = (await cookies()).get("admin_session");
  if (!auth?.value) throw new Error("Unauthorized");

  const { error } = await getSupabase().from("employers").update({ logo_url: logoUrl }).eq("id", employerId);
  if (error) throw error;
  return { success: true };
}

export async function toggleUserBan(userId: string, isBanned: boolean) {
  const auth = (await cookies()).get("admin_session");
  if (!auth?.value) throw new Error("Unauthorized");

  const { error } = await getSupabase().from("users").update({ is_banned: isBanned }).eq("id", userId);
  if (error) throw error;
  return { success: true };
}

export async function toggleJobStatus(jobId: string, status: "active" | "closed" | "pending") {
  const auth = (await cookies()).get("admin_session");
  if (!auth?.value) throw new Error("Unauthorized");

  const { error } = await getSupabase().from("jobs").update({ status }).eq("id", jobId);
  if (error) throw error;
  return { success: true };
}

export async function addEmployer(telegramId: number, businessName: string, businessType: string) {
  const auth = (await cookies()).get("admin_session");
  if (!auth?.value) throw new Error("Unauthorized");

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

  // 2. Insert new employer record
  const { data: newEmp, error: insertEmpErr } = await supabase
    .from("employers")
    .insert({
      user_id: userId,
      business_name: businessName,
      business_type: businessType,
      status: "approved",
    })
    .select("*, users(telegram_id)")
    .single();

  if (insertEmpErr) throw insertEmpErr;

  return { success: true, employer: newEmp };
}

export async function updateEmployer(employerId: string, businessName: string, businessType: string, dailyPostLimit: number) {
  const auth = (await cookies()).get("admin_session");
  if (!auth?.value) throw new Error("Unauthorized");

  if (!businessName.trim()) throw new Error("Business name cannot be empty.");
  if (![3, 5, -1].includes(dailyPostLimit)) throw new Error("Invalid post limit value.");

  const { data, error } = await getSupabase()
    .from("employers")
    .update({
      business_name: businessName.trim(),
      business_type: businessType.trim(),
      daily_post_limit: dailyPostLimit,
    })
    .eq("id", employerId)
    .select("*, users(telegram_id)")
    .single();

  if (error) throw error;
  return { success: true, employer: data };
}

export async function deleteEmployer(employerId: string, passwordAttempt: string) {
  const auth = (await cookies()).get("admin_session");
  if (!auth?.value) return { success: false, error: "Unauthorized" };

  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  if (passwordAttempt !== adminPassword) {
    return { success: false, error: "Incorrect admin password" };
  }

  const { error } = await getSupabase().from("employers").delete().eq("id", employerId);
  if (error) return { success: false, error: "Database error: Failed to delete" };
  
  return { success: true };
}
