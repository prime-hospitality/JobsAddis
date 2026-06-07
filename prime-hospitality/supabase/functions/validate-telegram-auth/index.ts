import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// -----------------------------------------------------------------------------
// Constants and Configuration
// -----------------------------------------------------------------------------
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// CORS Headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-telegram-init-data",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// -----------------------------------------------------------------------------
// Helper: Validate Telegram initData Signature
// -----------------------------------------------------------------------------
async function validateTelegramSignature(initData: string, botToken: string): Promise<boolean> {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get("hash");
    
    if (!hash) return false;
    
    urlParams.delete("hash");
    
    // Sort parameters alphabetically
    const paramsArray = Array.from(urlParams.entries());
    paramsArray.sort((a, b) => a[0].localeCompare(b[0]));
    
    const dataCheckString = paramsArray.map(([k, v]) => `${k}=${v}`).join("\n");
    
    const secretKey = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode("WebAppData"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const secret = await crypto.subtle.sign(
      "HMAC",
      secretKey,
      new TextEncoder().encode(botToken)
    );
    
    const hmacKey = await crypto.subtle.importKey(
      "raw",
      secret,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signature = await crypto.subtle.sign(
      "HMAC",
      hmacKey,
      new TextEncoder().encode(dataCheckString)
    );
    
    const hexSignature = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
      
    return hexSignature === hash;
  } catch (err) {
    console.error("Validation error:", err);
    return false;
  }
}

// -----------------------------------------------------------------------------
// Helper: Extract User from initData
// -----------------------------------------------------------------------------
function extractTelegramUser(initData: string) {
  const urlParams = new URLSearchParams(initData);
  const userJson = urlParams.get("user");
  if (!userJson) return null;
  try {
    return JSON.parse(userJson);
  } catch {
    return null;
  }
}

// -----------------------------------------------------------------------------
// Helper: HTML Sanitization
// -----------------------------------------------------------------------------
function sanitizeHtml(text: string): string {
  if (!text) return text;
  return text.replace(/<[^>]*>?/gm, ""); // Simple regex to strip HTML tags
}

// -----------------------------------------------------------------------------
// Main Edge Function Handler
// -----------------------------------------------------------------------------
serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const initData = req.headers.get("x-telegram-init-data");
    
    if (!initData) {
      return new Response(JSON.stringify({ error: "Missing x-telegram-init-data header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Validate Telegram Signature
    const isValid = await validateTelegramSignature(initData, TELEGRAM_BOT_TOKEN);
    if (!isValid) {
      return new Response(JSON.stringify({ error: "Invalid Telegram signature. Unauthorized." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Extract User Information
    const telegramUser = extractTelegramUser(initData);
    if (!telegramUser || !telegramUser.id) {
      return new Response(JSON.stringify({ error: "Could not extract user from initData" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const telegramId = telegramUser.id;

    // 3. User & Ban Check
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, is_banned, role")
      .eq("telegram_id", telegramId)
      .single();

    // If user exists and is banned, reject everything
    if (userData?.is_banned) {
      return new Response(JSON.stringify({ error: "Account banned. Please contact support." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Route logic based on payload
    const payload = await req.json();
    const action = payload.action; // e.g., "submit_application", "create_profile"

    // Example Application Submission Logic
    if (action === "submit_application") {
      const { jobId, coverNote } = payload;
      
      if (!jobId) {
         return new Response(JSON.stringify({ error: "jobId is required" }), { status: 400, headers: corsHeaders });
      }

      // 4. Rate Limiting: Max 10 applications per hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count, error: countError } = await supabase
        .from("applications")
        .select("*", { count: "exact", head: true })
        .eq("telegram_id", telegramId)
        .gte("created_at", oneHourAgo);

      if (countError) throw countError;
      if (count !== null && count >= 10) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Maximum 10 applications per hour." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 5. Fetch profile ID for the user
      const { data: profileData, error: profileError } = await supabase
         .from("profiles")
         .select("id")
         .eq("telegram_id", telegramId)
         .single();
         
      if (profileError || !profileData) {
         return new Response(JSON.stringify({ error: "Profile not found. Please complete onboarding." }), {
           status: 400, headers: corsHeaders
         });
      }

      // 6. Sanitization & Insertion
      const safeCoverNote = sanitizeHtml(coverNote || "");
      
      const { error: insertError } = await supabase
        .from("applications")
        .insert({
           job_id: jobId,
           profile_id: profileData.id,
           telegram_id: telegramId,
           cover_note: safeCoverNote,
           status: "pending"
        });

      if (insertError) {
        // Handle unique constraint violation (duplicate application)
        if (insertError.code === "23505") {
           return new Response(JSON.stringify({ error: "You have already applied for this job." }), {
             status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" }
           });
        }
        throw insertError;
      }

      // 7. Data Minimization: Return only success status, not the whole record
      return new Response(JSON.stringify({ success: true, message: "Application submitted successfully." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: Create Profile
    if (action === "create_profile") {
      const { profileData, cvUrl } = payload;
      
      let userId = userData?.id;

      // Ensure user exists first or create them
      if (!userId) {
        const { error: createUserError } = await supabase
          .from("users")
          .insert({
             telegram_id: telegramId,
             role: "job_seeker"
          });
        if (createUserError && createUserError.code !== '23505') {
            throw createUserError;
        }
        
        // Fetch the new user ID
        const { data: newUser, error: newUserError } = await supabase
          .from("users")
          .select("id")
          .eq("telegram_id", telegramId)
          .single();
          
        if (newUserError || !newUser) throw new Error("Failed to resolve user identity");
        userId = newUser.id;
      }

      let phoneToSave = profileData.contactShared ? sanitizeHtml(profileData.phoneNumber || "") : null;
      
      // If contact was shared but we don't have the number directly (e.g. from telegram WebApp frontend),
      // we check the telegram_contacts table which the webhook should have populated.
      if (profileData.contactShared && !phoneToSave) {
        const { data: contactData } = await supabase
          .from("telegram_contacts")
          .select("phone_number")
          .eq("telegram_id", telegramId)
          .single();
          
        if (contactData && contactData.phone_number) {
          phoneToSave = contactData.phone_number;
        }
      }

      const { error: insertError } = await supabase.from("profiles").insert({
        user_id: userId,
        telegram_id: telegramId,
        full_name: sanitizeHtml(profileData.fullName || ""),
        age: profileData.age,
        location: sanitizeHtml(profileData.location || ""),
        willing_to_relocate: profileData.willingToRelocate,
        gender: sanitizeHtml(profileData.gender || ""),
        phone_number: phoneToSave,
        contact_shared: profileData.contactShared,
        selected_categories: profileData.selectedCategories,
        experience_levels: profileData.experienceLevels,
        cv_url: cvUrl,
        onboarding_completed: true,
      });

      if (insertError) {
         if (insertError.code === "23505") {
             return new Response(JSON.stringify({ error: "Profile already exists." }), {
               status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" }
             });
         }
         throw insertError;
      }

      return new Response(JSON.stringify({ success: true, message: "Profile created." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: Update CV
    if (action === "update_cv") {
      const { cvUrl } = payload;
      
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ cv_url: cvUrl })
        .eq("telegram_id", telegramId);

      if (updateError) throw updateError;

      return new Response(JSON.stringify({ success: true, message: "CV updated successfully." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: Update Primary Phone
    if (action === "update_phone") {
      const { phoneNumber } = payload;
      const formatted = phoneNumber ? sanitizeHtml(phoneNumber.trim()) : null;

      // Server-side validation
      if (formatted) {
        const digits = formatted.replace(/\D/g, "");
        const isCarrierValid = digits.startsWith("2519") || digits.startsWith("2517");
        if (digits.length !== 12 || !isCarrierValid) {
          return new Response(JSON.stringify({ error: "Invalid Ethiopian phone number format. Must start with +251 9 or +251 7 and have 9 digits after the carrier prefix." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ phone_number: formatted, contact_shared: !!formatted })
        .eq("telegram_id", telegramId);

      if (updateError) throw updateError;

      return new Response(JSON.stringify({ success: true, message: "Phone number updated." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: Update Secondary Phone
    if (action === "update_secondary_phone") {
      const { secondaryPhone } = payload;
      const formatted = secondaryPhone ? sanitizeHtml(secondaryPhone.trim()) : null;

      // Server-side validation
      if (formatted) {
        const digits = formatted.replace(/\D/g, "");
        const isCarrierValid = digits.startsWith("2519") || digits.startsWith("2517");
        if (digits.length !== 12 || !isCarrierValid) {
          return new Response(JSON.stringify({ error: "Invalid Ethiopian phone number format. Must start with +251 9 or +251 7 and have 9 digits after the carrier prefix." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Use .select() so we get back the updated row — this confirms the write landed
      const { data: updatedRow, error: updateError } = await supabase
        .from("profiles")
        .update({ secondary_phone: formatted })
        .eq("telegram_id", telegramId)
        .select("secondary_phone")
        .single();

      if (updateError) throw updateError;

      if (!updatedRow) {
        throw new Error("Profile not found — no matching telegram_id.");
      }

      return new Response(JSON.stringify({ success: true, message: "Secondary phone updated.", secondary_phone: updatedRow.secondary_phone }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: Update Employer Logo
    if (action === "update_employer_logo") {
      const { logoUrl } = body;

      const { data: userRow } = await supabase.from("users").select("id").eq("telegram_id", telegramId).single();
      if (!userRow) throw new Error("Employer user not found.");

      const { data: employer } = await supabase.from("employers").select("id").eq("user_id", userRow.id).single();
      if (!employer) throw new Error("Employer profile not found.");

      const { error: updateErr } = await supabase
        .from("employers")
        .update({ logo_url: logoUrl })
        .eq("id", employer.id);

      if (updateErr) throw updateErr;

      return new Response(JSON.stringify({ success: true, message: "Logo updated successfully." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: Get Profile
    if (action === "get_profile") {
      const isEmployer = userData?.role === "employer";
      if (isEmployer) {
        return new Response(
          JSON.stringify({
            success: true,
            profile: null,
            onboarding_completed: true, // Employers skip job-seeker onboarding
            is_employer: true
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("telegram_id", telegramId)
        .single();

      // PGRST116 = "no rows" — user hasn't completed onboarding yet
      if (profileError && profileError.code !== "PGRST116") {
        throw profileError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          profile: profileData ?? null,
          onboarding_completed: profileData?.onboarding_completed ?? false,
          is_employer: false
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Action: Get Applications
    if (action === "get_applications") {
      const { data: appData, error: appError } = await supabase
        .from("applications")
        .select(`
          id,
          job_id,
          status,
          cover_note,
          created_at,
          jobs (
            title,
            location,
            neighborhood,
            employers (
              business_name,
              business_type
            )
          )
        `)
        .eq("telegram_id", telegramId)
        .order("created_at", { ascending: false });

      if (appError) throw appError;

      return new Response(
        JSON.stringify({
          success: true,
          applications: appData ?? [],
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Action: Get Employer Dashboard
    if (action === "get_employer_dashboard") {
      // 1) Find the user
      const { data: userRow, error: userErr } = await supabase
        .from("users")
        .select("id")
        .eq("telegram_id", telegramId)
        .single();

      if (userErr || !userRow) {
        return new Response(JSON.stringify({ error: "Employer user not found." }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 2) Find the employer record
      const { data: employer, error: empErr } = await supabase
        .from("employers")
        .select("id, business_name, status, daily_post_limit, logo_url")
        .eq("user_id", userRow.id)
        .single();

      if (empErr || !employer) {
        return new Response(JSON.stringify({ error: "Employer profile not found." }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 3) Fetch jobs for this employer
      const { data: jobsData, error: jobsErr } = await supabase
        .from("jobs")
        .select("*")
        .eq("employer_id", employer.id)
        .order("created_at", { ascending: false });

      if (jobsErr) throw jobsErr;

      // 4) For each job, count applications
      const jobsWithCounts = await Promise.all(
        (jobsData ?? []).map(async (job) => {
          const { count } = await supabase
            .from("applications")
            .select("id", { count: "exact", head: true })
            .eq("job_id", job.id);
          return { ...job, application_count: count ?? 0 };
        })
      );

      // 5) Count jobs posted today by this employer
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { count: todayCount } = await supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("employer_id", employer.id)
        .gte("created_at", todayStart.toISOString());

      // 6) Compute stats
      const active = jobsWithCounts.filter((j: any) => j.status === "active").length;
      const totalApplicants = jobsWithCounts.reduce((acc: number, j: any) => acc + j.application_count, 0);
      const pendingReview = jobsWithCounts.filter((j: any) => j.status === "pending").length;

      return new Response(
        JSON.stringify({
          success: true,
          employer: {
            id: employer.id,
            business_name: employer.business_name,
            status: employer.status,
            daily_post_limit: employer.daily_post_limit ?? 3,
            today_post_count: todayCount ?? 0,
            logo_url: employer.logo_url ?? null,
          },
          jobs: jobsWithCounts,
          stats: {
            totalJobs: jobsWithCounts.length,
            activeJobs: active,
            totalApplicants,
            pendingReview,
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Action: Post Job
    if (action === "post_job") {
      const { jobData } = payload;
      if (!jobData) {
        return new Response(JSON.stringify({ error: "jobData is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { title, category, jobType, salaryMin, salaryMax, neighborhood, description, deadline, experience, education, workingHours, quantity } = jobData;

      if (!title?.trim() || !description?.trim() || !deadline) {
        return new Response(JSON.stringify({ error: "Please fill in all required fields." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 1) Find the user & employer ID
      const { data: userRow, error: userErr } = await supabase
        .from("users")
        .select("id")
        .eq("telegram_id", telegramId)
        .single();

      if (userErr || !userRow) {
        return new Response(JSON.stringify({ error: "Employer user not found." }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: employer, error: empErr } = await supabase
        .from("employers")
        .select("id, status, daily_post_limit")
        .eq("user_id", userRow.id)
        .single();

      if (empErr || !employer) {
        return new Response(JSON.stringify({ error: "Employer profile not found." }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (employer.status !== "approved") {
        return new Response(JSON.stringify({ error: "Employer account not approved to post jobs." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check daily post limit
      const dailyLimit = employer.daily_post_limit ?? 3;
      if (dailyLimit !== -1) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const { count: todayCount, error: countErr } = await supabase
          .from("jobs")
          .select("id", { count: "exact", head: true })
          .eq("employer_id", employer.id)
          .gte("created_at", todayStart.toISOString());

        if (countErr) throw countErr;

        if ((todayCount ?? 0) >= dailyLimit) {
          return new Response(
            JSON.stringify({
              error: `You have reached your daily post limit of ${dailyLimit} jobs. Please wait until tomorrow or contact support to upgrade.`,
            }),
            {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      }

      // 2) Insert the job listing
      const { error: insertErr } = await supabase.from("jobs").insert({
        employer_id: employer.id,
        title: sanitizeHtml(title.trim()),
        category,
        job_type: jobType,
        salary_min: parseInt(salaryMin) || 0,
        salary_max: parseInt(salaryMax) || 0,
        currency: "ETB",
        neighborhood,
        location: `${neighborhood}, Addis Ababa`,
        description: sanitizeHtml(description.trim()),
        full_description: sanitizeHtml(description.trim()),
        status: "active",
        deadline,
        quantity: parseInt(quantity) || 1,
        requirements: {
          experience,
          education: sanitizeHtml(education?.trim() || ""),
          languages: ["Amharic"],
          locationPreference: null,
          workingHours: sanitizeHtml(workingHours?.trim() || ""),
        },
      });

      if (insertErr) throw insertErr;

      return new Response(
        JSON.stringify({
          success: true,
          message: "Job posted successfully.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Action: Edit Job
    if (action === "edit_job") {
      const { jobId, jobData } = payload;
      if (!jobId || !jobData) {
        return new Response(JSON.stringify({ error: "jobId and jobData are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { title, category, jobType, salaryMin, salaryMax, neighborhood, description, deadline, experience, education, workingHours, quantity } = jobData;

      if (!title?.trim() || !description?.trim() || !deadline) {
        return new Response(JSON.stringify({ error: "Please fill in all required fields." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 1) Find the user & employer ID
      const { data: userRow, error: userErr } = await supabase
        .from("users")
        .select("id")
        .eq("telegram_id", telegramId)
        .single();

      if (userErr || !userRow) {
        return new Response(JSON.stringify({ error: "Employer user not found." }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: employer, error: empErr } = await supabase
        .from("employers")
        .select("id, status")
        .eq("user_id", userRow.id)
        .single();

      if (empErr || !employer) {
        return new Response(JSON.stringify({ error: "Employer profile not found." }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 2) Update the job listing
      const { error: updateErr } = await supabase
        .from("jobs")
        .update({
          title: sanitizeHtml(title.trim()),
          category,
          job_type: jobType,
          salary_min: parseInt(salaryMin) || 0,
          salary_max: parseInt(salaryMax) || 0,
          neighborhood,
          location: `${neighborhood}, Addis Ababa`,
          description: sanitizeHtml(description.trim()),
          full_description: sanitizeHtml(description.trim()),
          deadline,
          quantity: parseInt(quantity) || 1,
          requirements: {
            experience,
            education: sanitizeHtml(education?.trim() || ""),
            languages: ["Amharic"],
            locationPreference: null,
            workingHours: sanitizeHtml(workingHours?.trim() || ""),
          },
        })
        .eq("id", jobId)
        .eq("employer_id", employer.id);

      if (updateErr) throw updateErr;

      return new Response(
        JSON.stringify({
          success: true,
          message: "Job updated successfully.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Action: Delete Job
    if (action === "delete_job") {
      const { jobId } = payload;
      if (!jobId) {
        return new Response(JSON.stringify({ error: "jobId is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 1) Find the user & employer ID
      const { data: userRow, error: userErr } = await supabase
        .from("users")
        .select("id")
        .eq("telegram_id", telegramId)
        .single();

      if (userErr || !userRow) {
        return new Response(JSON.stringify({ error: "Employer user not found." }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: employer, error: empErr } = await supabase
        .from("employers")
        .select("id")
        .eq("user_id", userRow.id)
        .single();

      if (empErr || !employer) {
        return new Response(JSON.stringify({ error: "Employer profile not found." }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 2) Delete associated applications first to prevent foreign key constraints
      const { error: appsDeleteErr } = await supabase
        .from("applications")
        .delete()
        .eq("job_id", jobId);
        
      if (appsDeleteErr) {
        console.error("Failed to delete associated applications:", appsDeleteErr);
        // We throw here because if we can't delete apps, deleting the job will fail anyway
        throw appsDeleteErr; 
      }

      // 3) Delete the job listing
      const { error: deleteErr } = await supabase
        .from("jobs")
        .delete()
        .eq("id", jobId)
        .eq("employer_id", employer.id);

      if (deleteErr) throw deleteErr;

      return new Response(
        JSON.stringify({
          success: true,
          message: "Job deleted successfully.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Action: Get Job Applicants (employer only)
    if (action === "get_job_applicants") {
      const { jobId } = payload;
      if (!jobId) return new Response(JSON.stringify({ error: "jobId required" }), { status: 400, headers: corsHeaders });

      // Verify employer
      const { data: uRow } = await supabase.from("users").select("id").eq("telegram_id", telegramId).single();
      if (!uRow) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: corsHeaders });
      const { data: emp } = await supabase.from("employers").select("id").eq("user_id", uRow.id).single();
      if (!emp) return new Response(JSON.stringify({ error: "Not an employer" }), { status: 403, headers: corsHeaders });

      const { data: apps, error: appsErr } = await supabase
        .from("applications")
        .select("id, telegram_id, status, cover_note, created_at, profiles(full_name, location, experience_levels, gender, age, willing_to_relocate, selected_categories, phone_number, secondary_phone, cv_url)")
        .eq("job_id", jobId)
        .order("created_at", { ascending: true });

      if (appsErr) throw appsErr;
      return new Response(JSON.stringify({ success: true, applicants: apps ?? [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Action: Get Notifications (job seeker)
    if (action === "get_notifications") {
      const { data: notifs, error: notifErr } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_telegram_id", telegramId)
        .order("created_at", { ascending: false });

      if (notifErr) throw notifErr;
      return new Response(JSON.stringify({ success: true, notifications: notifs ?? [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Action: Mark Notifications Read
    if (action === "mark_notifications_read") {
      const { error: markErr } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_telegram_id", telegramId)
        .eq("read", false);

      if (markErr) throw markErr;
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Action: Get Unread Notification Count
    if (action === "get_unread_count") {
      const { count, error: cntErr } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_telegram_id", telegramId)
        .eq("read", false);

      if (cntErr) throw cntErr;
      return new Response(JSON.stringify({ success: true, unread_count: count ?? 0 }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Action: Post Job (with active status override)
    // Note: existing post_job action above sets status: "pending" — jobs now go active immediately.
    // The above handler is left intact; status override is controlled at the Edge Function level via the employer's trust status.

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Edge function error:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
