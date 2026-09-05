// -----------------------------------------------------------------------------
// telegram-webhook
//
// Receives raw Telegram Bot API updates. Two jobs:
//   1. /start (and any other message) -- reply with a button that opens the
//      Mini App. This is the bot's front door: someone who finds the bot and
//      messages it needs a way in, and a silent bot reads as broken.
//   2. Shared contacts -- capture the phone number a user shares during
//      onboarding.
//
// Register with:
//   https://api.telegram.org/bot<TOKEN>/setWebhook?url=<function-url>
// Re-register whenever the bot token changes -- the webhook is bound to the
// bot, so a token swap silently stops delivering updates until it is re-set.
// -----------------------------------------------------------------------------

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { escapeHtml, miniAppUrl } from "../_shared/telegram.ts";
import { serviceKey } from "../_shared/serviceKey.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";

const supabase = createClient(SUPABASE_URL, serviceKey());

/** `name` is already HTML-escaped by the caller. */
function welcomeText(name: string): string {
  const greeting = name ? `👋 <b>Welcome, ${name}!</b>` : `👋 <b>Welcome to JobsAddis</b>`;
  return (
    `${greeting}\n\n` +
    `JobsAddis is Ethiopia's hospitality job platform — find hotel, restaurant ` +
    `and café vacancies across Addis Ababa.\n\n` +
    `Tap below to open the app, build your profile and start applying.`
  );
}

/** Replies to a chat. Deliberately separate from the shared DM helper: this is
 *  a direct response to an inbound update, so it must not be rate-limit
 *  throttled or treated as best-effort fan-out. */
async function reply(chatId: number | string, text: string, buttonUrl: string | null) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("[Webhook] TELEGRAM_BOT_TOKEN is not set -- cannot reply.");
    return;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        // No button rather than a wrong one if TELEGRAM_MINI_APP_URL is unset.
        reply_markup: buttonUrl
          ? { inline_keyboard: [[{ text: "🚀 Open JobsAddis", url: buttonUrl }]] }
          : undefined,
      }),
    });
    if (!res.ok) {
      console.error("[Webhook] Reply failed:", await res.text());
    }
  } catch (err) {
    console.error("[Webhook] Reply threw:", err);
  }
}

serve(async (req: Request) => {
  try {
    const update = await req.json();
    const message = update.message;

    if (!message) return new Response("OK", { status: 200 });

    // ── 1. Shared contact (onboarding phone capture) ─────────────────────────
    if (message.contact) {
      const contact = message.contact;
      const telegramId = contact.user_id || message.from?.id;
      let phone = contact.phone_number;

      if (phone && !phone.startsWith("+")) {
        phone = "+" + phone;
      }

      if (telegramId && phone) {
        console.log(`Received contact for user ${telegramId}`);
        // Save to telegram_contacts
        const { error: upsertError } = await supabase.from("telegram_contacts").upsert({
          telegram_id: telegramId,
          phone_number: phone
        });

        if (upsertError) {
          console.error("Error upserting into telegram_contacts:", upsertError);
        }

        // Try to update profile if it exists (in case the webhook arrives after the profile was created)
        const { error: updateError } = await supabase.from("profiles")
          .update({ phone_number: phone })
          .eq("telegram_id", telegramId);

        if (updateError) {
          console.error("Error updating profile:", updateError);
        }
      }

      return new Response("OK", { status: 200 });
    }

    // ── 2. Text messages ─────────────────────────────────────────────────────
    // Only respond to direct 1-on-1 DMs with the bot. Never reply to messages in groups/channels!
    if (message.chat?.type && message.chat.type !== "private") {
      return new Response("OK", { status: 200 });
    }

    const text: string = (message.text || "").trim();
    const chatId = message.chat?.id;
    if (!text || !chatId) return new Response("OK", { status: 200 });

    // /start may carry a deep-link payload ("/start job_<uuid>") from a shared
    // link; pass it through so the button lands on that job rather than home.
    if (text === "/start" || text.startsWith("/start ")) {
      const payload = text.slice("/start".length).trim();
      const firstName = escapeHtml(message.from?.first_name || "");
      await reply(chatId, welcomeText(firstName), miniAppUrl(payload || undefined));
      return new Response("OK", { status: 200 });
    }

    if (text === "/help") {
      await reply(
        chatId,
        `ℹ️ <b>JobsAddis Help</b>\n\n` +
          `Everything happens inside the app — browsing vacancies, your profile, ` +
          `your CV and your applications.\n\n` +
          `Open it below, then use <b>Profile → Help &amp; FAQ</b> for common ` +
          `questions and support contacts.`,
        miniAppUrl(),
      );
      return new Response("OK", { status: 200 });
    }

    // Anything else: the bot holds no conversation, so point back to the app
    // rather than leaving the message unanswered.
    await reply(
      chatId,
      `Everything happens inside the JobsAddis app — tap below to open it.`,
      miniAppUrl(),
    );

    return new Response("OK", { status: 200 });
  } catch (e) {
    console.error("Webhook error:", e);
    // Return 200 so Telegram doesn't retry infinitely on malformed payloads
    return new Response("Error", { status: 200 });
  }
});
