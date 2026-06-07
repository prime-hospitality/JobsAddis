import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const SEND_NOTIFICATION_URL = `${SUPABASE_URL}/functions/v1/send-telegram-notification`;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
    if (!initData) {
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
    const telegramId = telegramUser.id;

    const payload = await req.json();
    const { action, applicationId } = payload;

    // ── Verify caller is an employer ──────────────────────────────────────────
    const { data: userRow } = await supabase.from("users").select("id").eq("telegram_id", telegramId).single();
    if (!userRow) return new Response(JSON.stringify({ error: "User not found" }), { status: 404, headers: corsHeaders });

    const { data: employer } = await supabase.from("employers").select("id, business_name").eq("user_id", userRow.id).single();
    if (!employer) {
      return new Response(JSON.stringify({ error: "Not an employer" }), { status: 403, headers: corsHeaders });
    }

    // ── Action: shortlist ─────────────────────────────────────────────────────
    if (action === "shortlist") {
      if (!applicationId) return new Response(JSON.stringify({ error: "applicationId required" }), { status: 400, headers: corsHeaders });

      // 1. Fetch the application to get job title and applicant telegram_id
      const { data: app, error: appErr } = await supabase
        .from("applications")
        .select("id, telegram_id, status, jobs(title)")
        .eq("id", applicationId)
        .single();

      if (appErr || !app) return new Response(JSON.stringify({ error: "Application not found" }), { status: 404, headers: corsHeaders });

      // 2. Update status
      const { error: updateErr } = await supabase
        .from("applications")
        .update({ status: "shortlisted" })
        .eq("id", applicationId);
      if (updateErr) throw updateErr;

      const jobTitle = Array.isArray(app.jobs) ? app.jobs[0]?.title : (app.jobs as any)?.title ?? "the role";

      // 3. Insert notification record
      await supabase.from("notifications").insert({
        user_telegram_id: app.telegram_id,
        company_name: employer.business_name,
        job_title: jobTitle,
        type: "shortlisted",
        read: false,
      });

      // 4. Send Telegram DM (disabled per user request)
      /*
      fetch(SEND_NOTIFICATION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          telegram_id: app.telegram_id,
          business_name: employer.business_name,
          job_title: jobTitle,
        }),
      }).catch((e) => console.error("DM send failed (non-fatal):", e));
      */

      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Action: unshortlist ───────────────────────────────────────────────────
    if (action === "unshortlist") {
      const { error } = await supabase.from("applications").update({ status: "pending" }).eq("id", applicationId);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Action: decline ───────────────────────────────────────────────────────
    if (action === "decline") {
      const { error } = await supabase.from("applications").update({ status: "rejected" }).eq("id", applicationId);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: corsHeaders });

  } catch (error) {
    console.error("shortlist-applicant error:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500, headers: corsHeaders });
  }
});
