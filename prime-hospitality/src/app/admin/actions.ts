"use server";

import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const getSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key";
  return createClient(supabaseUrl, supabaseServiceKey);
};

export async function loginAdmin(username: string, password: string) {
  const supabase = getSupabase();

  // Get stored username (default: "admin")
  const { data: uCfg } = await supabase.from("app_config").select("value").eq("key", "admin_username").single();
  const storedUsername = uCfg?.value?.trim() || "admin";

  // Get stored password (fallback to env var)
  const { data: pCfg } = await supabase.from("app_config").select("value").eq("key", "admin_password").single();
  const storedPassword = pCfg?.value?.trim() || process.env.ADMIN_PASSWORD || "admin123";

  if (username.toLowerCase() === storedUsername.toLowerCase() && password === storedPassword) {
    (await cookies()).set("admin_session", "true", { maxAge: 60 * 60 * 24, httpOnly: true, secure: process.env.NODE_ENV === "production" });
    return { success: true };
  }
  return { success: false, error: "Invalid username or password" };
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

  const supabase = getSupabase();
  const { data: uCfg } = await supabase.from("app_config").select("value").eq("key", "admin_username").single();
  const adminUsername = uCfg?.value?.trim() || "admin";

  // Fetch special requests from app_config
  const { data: srCfg } = await supabase.from("app_config").select("value").eq("key", "special_requests").maybeSingle();
  let specialRequests = [];
  try {
    if (srCfg?.value) specialRequests = JSON.parse(srCfg.value);
  } catch (e) {}

  return {
    employers: employers ?? [],
    jobs: jobs ?? [],
    users: users ?? [],
    adminUsername,
    specialRequests
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

export async function toggleUserBan(userId: string, isBanned: boolean, passwordAttempt: string) {
  const auth = (await cookies()).get("admin_session");
  if (!auth?.value) return { success: false, error: "Unauthorized" };

  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  if (passwordAttempt !== adminPassword) {
    return { success: false, error: "Incorrect admin password" };
  }

  const { error } = await getSupabase().from("users").update({ is_banned: isBanned }).eq("id", userId);
  if (error) return { success: false, error: "Failed to update ban status" };
  return { success: true };
}

export async function deleteUser(userId: string, passwordAttempt: string) {
  const auth = (await cookies()).get("admin_session");
  if (!auth?.value) return { success: false, error: "Unauthorized" };

  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  if (passwordAttempt !== adminPassword) {
    return { success: false, error: "Incorrect admin password" };
  }

  const supabase = getSupabase();

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

  const supabase = getSupabase();

  // 1. Fetch employer to get the logo URL before deletion
  const { data: employer } = await supabase
    .from("employers")
    .select("logo_url")
    .eq("id", employerId)
    .single();

  // 2. Delete the employer
  const { error } = await supabase.from("employers").delete().eq("id", employerId);
  if (error) return { success: false, error: "Database error: Failed to delete" };
  
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
  const auth = (await cookies()).get("admin_session");
  if (!auth?.value) return { success: false, error: "Unauthorized" };

  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  if (passwordAttempt !== adminPassword) {
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
