import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { serviceKey } from "../_shared/serviceKey.ts";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";

const supabase = createClient(SUPABASE_URL, serviceKey());

/**
 * Grace period before a shortlist notice becomes visible to the seeker. Kept in
 * step with SHORTLIST_NOTICE_DELAY_MINUTES in
 * src/app/emp/dashboard/applicants/actions.ts — change both together.
 */
const SHORTLIST_NOTICE_DELAY_MINUTES = 2;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-telegram-init-data",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── Validate Telegram Signature ───────────────────────────────────────────────
async function validateTelegramSignature(initData: string, botToken: string): Promise<boolean> {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get("hash");
    if (!hash) return false;
    urlParams.delete("hash");
    const paramsArray = Array.from(urlParams.entries());
    paramsArray.sort((a, b) => a[0].localeCompare(b[0]));
    const dataCheckString = paramsArray.map(([k, v]) => `${k}=${v}`).join("\n");
    const secretKey = await crypto.subtle.importKey("raw", new TextEncoder().encode("WebAppData"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const secret = await crypto.subtle.sign("HMAC", secretKey, new TextEncoder().encode(botToken));
    const hmacKey = await crypto.subtle.importKey("raw", secret, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const signature = await crypto.subtle.sign("HMAC", hmacKey, new TextEncoder().encode(dataCheckString));
    const hexSignature = Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");
    return hexSignature === hash;
  } catch { return false; }
}

function extractTelegramUser(initData: string) {
  const urlParams = new URLSearchParams(initData);
  const userJson = urlParams.get("user");
  if (!userJson) return null;
  try { return JSON.parse(userJson); } catch { return null; }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const initData = req.headers.get("x-telegram-init-data");

    // Fail closed. A missing bot token used to disable signature checking entirely
    // and fall back to a hardcoded telegram id, which turned a misconfigured
    // environment into an open door onto every employer's applicants.
    if (!TELEGRAM_BOT_TOKEN) {
      console.error("TELEGRAM_BOT_TOKEN is not configured — refusing to authenticate.");
      return new Response(JSON.stringify({ error: "Server auth is not configured." }), { status: 500, headers: corsHeaders });
    }

    if (!initData || initData.trim() === "") {
      return new Response(JSON.stringify({ error: "Missing auth header" }), { status: 401, headers: corsHeaders });
    }

    const isValid = await validateTelegramSignature(initData, TELEGRAM_BOT_TOKEN);
    if (!isValid) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const telegramUser = extractTelegramUser(initData);
    if (!telegramUser?.id) {
      return new Response(JSON.stringify({ error: "Could not extract user" }), { status: 400, headers: corsHeaders });
    }
    const telegramId: number = telegramUser.id;

    const payload = await req.json();
    const { action, applicationId } = payload;

    // ── Verify caller is an employer ──────────────────────────────────────────
    const { data: userRow } = await supabase.from("users").select("id").eq("telegram_id", telegramId).single();
    if (!userRow) return new Response(JSON.stringify({ error: "User not found" }), { status: 404, headers: corsHeaders });

    const { data: employer } = await supabase.from("employers").select("id, business_name").eq("user_id", userRow.id).single();
    if (!employer) {
      return new Response(JSON.stringify({ error: "Not an employer" }), { status: 403, headers: corsHeaders });
    }

    const STATUS_BY_ACTION: Record<string, string> = {
      shortlist: "shortlisted",
      unshortlist: "pending",
      decline: "rejected",
    };

    const newStatus = STATUS_BY_ACTION[action];
    if (!newStatus) {
      return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: corsHeaders });
    }
    if (!applicationId) {
      return new Response(JSON.stringify({ error: "applicationId required" }), { status: 400, headers: corsHeaders });
    }

    // ── Verify this application belongs to one of THIS employer's jobs ────────
    // Without this an employer could shortlist or decline any other employer's
    // applicants just by knowing an application id.
    const { data: app, error: appErr } = await supabase
      .from("applications")
      .select("id, telegram_id, status, jobs!inner(id, title, employer_id)")
      .eq("id", applicationId)
      .single();

    if (appErr || !app) {
      return new Response(JSON.stringify({ error: "Application not found" }), { status: 404, headers: corsHeaders });
    }

    const job = Array.isArray((app as any).jobs) ? (app as any).jobs[0] : (app as any).jobs;
    if (!job || job.employer_id !== employer.id) {
      return new Response(JSON.stringify({ error: "Not your applicant" }), { status: 403, headers: corsHeaders });
    }

    const { error: updateErr } = await supabase
      .from("applications")
      .update({ status: newStatus })
      .eq("id", applicationId);
    if (updateErr) throw updateErr;

    // Seekers are told when they're shortlisted — good news only. Declines stay
    // silent; the seeker sees the status in My Applications if they look.
    if (newStatus === "shortlisted") {
      try {
        // Matches the web dashboard: the notice stays invisible for a few
        // minutes so an employer who clicks by mistake can take it back before
        // anyone is told, and one applicant is never announced twice.
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_telegram_id", (app as any).telegram_id)
          .eq("job_id", job.id)
          .eq("type", "shortlisted")
          .limit(1)
          .maybeSingle();

        if (!existing) {
          await supabase.from("notifications").insert({
            user_telegram_id: (app as any).telegram_id,
            company_name: employer.business_name,
            job_title: job.title || "",
            type: "shortlisted",
            job_id: job.id,
            read: false,
            deliver_after: new Date(Date.now() + SHORTLIST_NOTICE_DELAY_MINUTES * 60_000).toISOString(),
          });
        }
      } catch (notifyErr) {
        console.error("Failed to notify shortlisted applicant:", notifyErr);
      }
    } else {
      // Moving out of shortlisted: drop a notice the seeker has not seen yet.
      // This function has no UI to confirm from, so a delivered notice is left
      // alone rather than silently retracted.
      await supabase
        .from("notifications")
        .delete()
        .eq("user_telegram_id", (app as any).telegram_id)
        .eq("job_id", job.id)
        .eq("type", "shortlisted")
        .gt("deliver_after", new Date().toISOString());
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    const detail = error?.message || error?.toString() || "Unknown error";
    console.error("shortlist-applicant error:", detail);
    return new Response(JSON.stringify({ error: detail }), { status: 500, headers: corsHeaders });
  }
});
