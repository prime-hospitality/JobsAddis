// -----------------------------------------------------------------------------
// Shared Telegram Bot API helpers.
//
// A Mini App has no push channel of its own -- it only exists while the user
// has it open. A bot DM is therefore the only way to reach someone who isn't
// currently looking at the app, which makes this file the delivery layer for
// every user-facing alert. Rows in `notifications` remain the source of truth;
// a DM is a best-effort nudge on top of one, and a failed send must never fail
// the action that triggered it.
//
// Kept in one place so the bot token, the Mini App deep-link format, and the
// rate-limit handling don't drift between call sites.
// -----------------------------------------------------------------------------

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";

/** Strips the bot token out of anything headed for the logs.
 *
 *  The token is a path segment of every Bot API URL, and Deno's fetch puts the
 *  whole URL in its error message -- so `console.error(err)` on a network
 *  failure writes the live token into the log stream in plaintext, where it
 *  stays for the retention window. Every log call in this file goes through
 *  here. */
function redact(value: unknown): string {
  const text = value instanceof Error ? `${value.name}: ${value.message}` : String(value);
  return TELEGRAM_BOT_TOKEN ? text.replaceAll(TELEGRAM_BOT_TOKEN, "<bot-token>") : text;
}

/** Escapes text for Telegram's HTML parse mode. Telegram only recognises a
 *  small tag set, so `&`, `<` and `>` are all that need encoding -- but they
 *  must be encoded, or a job title containing "R&D" or "<Chef>" silently
 *  fails the whole sendMessage call with a 400. */
export function escapeHtml(text: string): string {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Builds a deep link that opens the Mini App, optionally at a specific
 *  screen via Telegram's `startapp` parameter (e.g. `job_<uuid>`).
 *
 *  Returns null when TELEGRAM_MINI_APP_URL is unset. Callers must treat that
 *  as "send the message without a button" -- never as a reason to substitute
 *  some other bot's URL. A hardcoded fallback here would mean a misconfigured
 *  deploy silently sends real users to a different bot's app, which is exactly
 *  the failure this function exists to prevent. */
export function miniAppUrl(startParam?: string): string | null {
  const base = Deno.env.get("TELEGRAM_MINI_APP_URL");
  if (!base) {
    console.error(
      "[Telegram] TELEGRAM_MINI_APP_URL is not set -- sending without a deep link. " +
        "Set it to the bot's Mini App URL (e.g. https://t.me/<bot>/<app>).",
    );
    return null;
  }
  return startParam ? `${base}?startapp=${startParam}` : base;
}

export interface DirectMessageOptions {
  /** Label for an inline button that opens the Mini App. Omitted entirely if
   *  TELEGRAM_MINI_APP_URL is unset. */
  buttonText?: string;
  /** Telegram `startapp` payload, e.g. `job_<uuid>`, so the button lands on a
   *  specific screen rather than the app's home. */
  startParam?: string;
}

export interface SendResult {
  ok: boolean;
  /** True for terminal cases -- the user blocked the bot, never started it, or
   *  deactivated their account. Not worth retrying. Only meaningful when
   *  `ok` is false. */
  blocked?: boolean;
  error?: string;
}

function buildReplyMarkup(opts?: DirectMessageOptions) {
  if (!opts?.buttonText) return undefined;
  const url = miniAppUrl(opts.startParam);
  if (!url) return undefined;
  return { inline_keyboard: [[{ text: opts.buttonText, url }]] };
}

/** Sends one Bot API DM. Never throws -- returns a result instead, because
 *  every caller is a best-effort nudge attached to an action that has already
 *  succeeded.
 *
 *  `blocked: true` marks the terminal cases (user blocked the bot, never
 *  started it, or deactivated their account). Those are normal in a Mini App
 *  -- a user who opened the app from a channel link may never have started a
 *  chat with the bot -- and are not worth retrying or alerting on. */
export async function sendDirectMessage(
  telegramId: number | string,
  text: string,
  opts?: DirectMessageOptions,
): Promise<SendResult> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("[Telegram] TELEGRAM_BOT_TOKEN is not set -- cannot send DM.");
    return { ok: false, blocked: false, error: "Bot token not configured" };
  }
  if (!telegramId) {
    return { ok: false, blocked: false, error: "Missing telegram_id" };
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: telegramId,
          text,
          parse_mode: "HTML",
          // Job alerts are the bulk of what we send; suppressing link previews
          // keeps them compact in the chat list.
          disable_web_page_preview: true,
          reply_markup: buildReplyMarkup(opts),
        }),
      },
    );

    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => ({}));
    const description: string = body?.description || `HTTP ${res.status}`;
    // 403 = blocked/never-started/deactivated. 400 "chat not found" is the
    // same situation reported under a different status.
    const blocked = res.status === 403 || /chat not found/i.test(description);
    if (!blocked) {
      console.error(`[Telegram] DM to ${telegramId} failed: ${redact(description)}`);
    }
    return { ok: false, blocked, error: description };
  } catch (err) {
    console.error(`[Telegram] DM to ${telegramId} threw: ${redact(err)}`);
    return { ok: false, blocked: false, error: redact(err) };
  }
}

/** Shape the group announcement needs, whatever the source. Column names come
 *  straight off a `jobs` row so the cron can pass one through unchanged. */
export interface AnnounceableJob {
  id: string;
  title: string;
  category: string;
  neighborhood?: string | null;
  job_type?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  /** Years the employer asked for. Null means unstated, which the announcement
   *  omits rather than rendering as "any". */
  min_years_experience?: number | null;
  quantity?: number | null;
  deadline?: string | null;
  description?: string | null;
}

const CATEGORY_EMOJI: Record<string, string> = {
  Waiter: "💁",
  Chef: "🍳",
  Receptionist: "🛎️",
  Barista: "☕",
  Housekeeper: "🧹",
  Security: "🛡️",
  Cashier: "💵",
  Manager: "💼",
};

/** Posts a new vacancy to the public Telegram group/channel.
 *
 *  This is the platform's shopfront: people who would never open a Mini App on
 *  purpose see vacancies scroll past in their normal Telegram feed and tap
 *  straight into the job. Best-effort -- a failed post must never fail the
 *  publish that triggered it.
 *
 *  Lives here rather than inside one edge function because a job can become
 *  active down four different routes (employer web post, admin approval, the
 *  scheduled-publish sweep, and the Telegram-surface post_job action), and all
 *  of them must announce identically. */
export async function sendGroupAnnouncement(job: AnnounceableJob, businessName: string): Promise<boolean> {
  const chatId = Deno.env.get("TELEGRAM_GROUP_CHAT_ID");

  if (!chatId || !TELEGRAM_BOT_TOKEN) {
    console.warn("[Telegram Group] TELEGRAM_GROUP_CHAT_ID or TELEGRAM_BOT_TOKEN is not configured.");
    return false;
  }

  // -1 and -2 are the sentinels resolveSalary() writes; everything else is a
  // real figure. The old version tested `min > 0` first, so a job with the
  // amount only in salary_max -- which is what filling just the Maximum box
  // produced -- fell through to the negotiable wording and announced a fixed
  // 25,000 salary as having none. Each side falls back to the other, and a
  // single figure prints once rather than as "25,000 - 25,000".
  const min = Number(job.salary_min) || 0;
  const max = Number(job.salary_max) || 0;
  const money = (n: number) => `${n.toLocaleString()} ETB`;
  let salaryText: string;
  if (min === -1) salaryText = "Negotiable";
  else if (min === -2) salaryText = "Per company scale";
  else if (min > 0 && max > 0) salaryText = min === max ? money(min) : `${min.toLocaleString()} - ${money(max)}`;
  else if (min > 0 || max > 0) salaryText = money(min > 0 ? min : max);
  else salaryText = "Negotiable / Scale";

  // The years the employer asked for. Absent means they did not state one, and
  // that stays absent rather than becoming "any" -- an announcement is a
  // summary, and a line saying nothing is required is not worth a line.
  const years = job.min_years_experience;
  const experienceText =
    years == null ? null : years <= 0 ? "No experience required" : `${years}+ years experience`;

  let deadlineText = "N/A";
  if (job.deadline) {
    try {
      deadlineText = new Date(job.deadline).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      deadlineText = String(job.deadline);
    }
  }

  const emoji = CATEGORY_EMOJI[job.category] || "🏨";
  const description = (job.description || "").trim();
  const excerpt = description.length > 200 ? `${description.slice(0, 200)}...` : description;

  const message = `🆕 <b>New Job Opening</b>

🏢 <b>${escapeHtml(businessName)}</b>
${emoji} <b>${escapeHtml(job.title)}</b> (${escapeHtml(job.category)})
📍 ${escapeHtml(job.neighborhood || "Addis Ababa")}, Addis Ababa
💰 ${salaryText} · ${escapeHtml(job.job_type || "Full Time")}${experienceText ? `\n🎓 ${experienceText}` : ""}
👥 ${Number(job.quantity) || 1} opening(s)
📅 Deadline: <b>${deadlineText}</b>${excerpt ? `\n\n📝 <i>${escapeHtml(excerpt)}</i>` : ""}`;

  // If TELEGRAM_MINI_APP_URL is unset, miniAppUrl() logs loudly and returns
  // null, and the announcement goes out with no button. It deliberately does
  // NOT fall back to another bot's URL: that used to point at a development
  // bot, so a misconfigured deploy silently sent every reader of the client's
  // group into the wrong app, with no error anywhere.
  const webAppUrl = miniAppUrl(`job_${job.id}`);
  const replyMarkup = webAppUrl
    ? { inline_keyboard: [[{ text: "🔍 View & Apply →", url: webAppUrl }]] }
    : undefined;

  // A group post is a one-shot event -- unlike a DM there is no second chance
  // later from a different notification -- and the failure that prompted this
  // was a bare TCP reset, which the very next attempt would have survived. So
  // retry transient failures here rather than leaving them to the next sweep a
  // minute later. 4xx other than 429 is the payload being wrong; retrying that
  // just posts the same rejected message three times.
  const MAX_ATTEMPTS = 3;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (attempt > 1) {
      await new Promise((r) => setTimeout(r, 500 * 2 ** (attempt - 2)));
    }

    try {
      const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "HTML",
          reply_markup: replyMarkup,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        console.log("[Telegram Group] Announced job", job.id, "msg", data.result?.message_id);
        return true;
      }

      const retriable = res.status === 429 || res.status >= 500;
      console.error(
        `[Telegram Group] Job ${job.id} rejected (attempt ${attempt}/${MAX_ATTEMPTS}, HTTP ${res.status}): ` +
          redact(data?.description || "no description"),
      );
      if (!retriable) return false;
    } catch (err) {
      // Network-level failure: connection reset, DNS, TLS. Always worth another
      // go -- nothing about the request itself is wrong.
      console.error(
        `[Telegram Group] Job ${job.id} send threw (attempt ${attempt}/${MAX_ATTEMPTS}): ${redact(err)}`,
      );
    }
  }

  console.error(`[Telegram Group] Giving up on job ${job.id} after ${MAX_ATTEMPTS} attempts.`);
  return false;
}

export interface FanOutSummary {
  sent: number;
  blocked: number;
  failed: number;
}

/** Fans a message out to many users, throttled to stay inside Telegram's
 *  ~30-messages-per-second bot limit.
 *
 *  Sends in chunks of CHUNK_SIZE concurrently, then pauses for the rest of the
 *  second before the next chunk. Callers with very large audiences should
 *  split the recipient list across several invocations rather than passing
 *  tens of thousands of ids in one call, since an edge function has a wall
 *  clock limit. */
export async function sendDirectMessages(
  telegramIds: (number | string)[],
  text: string,
  opts?: DirectMessageOptions,
): Promise<FanOutSummary> {
  const CHUNK_SIZE = 25;
  const CHUNK_INTERVAL_MS = 1000;

  const summary: FanOutSummary = { sent: 0, blocked: 0, failed: 0 };
  const recipients = telegramIds.filter(Boolean);

  for (let i = 0; i < recipients.length; i += CHUNK_SIZE) {
    const chunk = recipients.slice(i, i + CHUNK_SIZE);
    const startedAt = Date.now();

    const results = await Promise.all(
      chunk.map((id) => sendDirectMessage(id, text, opts)),
    );
    for (const r of results) {
      if (r.ok) summary.sent++;
      else if (r.blocked) summary.blocked++;
      else summary.failed++;
    }

    const isLastChunk = i + CHUNK_SIZE >= recipients.length;
    if (!isLastChunk) {
      const elapsed = Date.now() - startedAt;
      if (elapsed < CHUNK_INTERVAL_MS) {
        await new Promise((r) => setTimeout(r, CHUNK_INTERVAL_MS - elapsed));
      }
    }
  }

  return summary;
}
