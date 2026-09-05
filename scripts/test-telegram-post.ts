#!/usr/bin/env -S deno run --allow-env --allow-net --allow-read
/**
 * Local test script — previews the Telegram group announcement message
 * without touching the database or deploying anything.
 *
 * Usage (from the workspace root):
 *   deno run --allow-env --allow-net --allow-read scripts/test-telegram-post.ts
 *
 * It reads TELEGRAM_BOT_TOKEN and TELEGRAM_GROUP_CHAT_ID from a .env.local
 * file in the prime-hospitality/ directory (or from real env vars if set).
 */

// ---------------------------------------------------------------------------
// Minimal .env.local loader
// ---------------------------------------------------------------------------
async function loadEnv() {
  try {
    const raw = await Deno.readTextFile("prime-hospitality/.env.local");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      Deno.env.set(key, val);
    }
  } catch {
    // No .env.local — rely on real env vars already being set
  }
}

// ---------------------------------------------------------------------------
// Helpers (mirrored from _shared/telegram.ts)
// ---------------------------------------------------------------------------
function escapeHtml(text: string): string {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
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

// ---------------------------------------------------------------------------
// ✏️  EDIT THIS to match a real job you want to preview
// ---------------------------------------------------------------------------
const SAMPLE_JOB = {
  id: "test-job-amharic",
  title: "ዋና አስተናጋጅ",
  category: "Waiter",
  neighborhood: "Bole",
  job_type: "Full Time",
  salary_min: 8000,
  salary_max: 12000,
  min_years_experience: 1,
  gender_preference: "female",  // "male" | "female" | null
  quantity: 3,
  deadline: "2026-09-20",
  description:
    "በቦሌ ለሚገኘው ባለ 5 ኮከብ ሆቴላችን ልምድ ያላቸውን አስተናጋጆች አወዳድረን መቅጠር እንፈልጋለን። መልካም የስራ ስነ-ምግባር እና ተግባቢ መሆን ይጠበቅባቸዋል።",
};

const SAMPLE_BUSINESS = "ሰንሻይን ግራንድ ሆቴል";

// ---------------------------------------------------------------------------
// Build message (exact same logic as sendGroupAnnouncement in telegram.ts)
// ---------------------------------------------------------------------------
function buildMessage(job: typeof SAMPLE_JOB, businessName: string): string {
  const min = Number(job.salary_min) || 0;
  const max = Number(job.salary_max) || 0;
  const money = (n: number) => `${n.toLocaleString()} ETB`;
  let salaryText: string;
  if (min === -1) salaryText = "Negotiable";
  else if (min === -2) salaryText = "Per company scale";
  else if (min > 0 && max > 0) salaryText = min === max ? money(min) : `${min.toLocaleString()} - ${money(max)}`;
  else if (min > 0 || max > 0) salaryText = money(min > 0 ? min : max);
  else salaryText = "Negotiable / Scale";

  const years = job.min_years_experience;
  const experienceText =
    years == null ? null : years <= 0 ? "No experience required" : `${years}+ years experience`;

  const gender = String(job.gender_preference ?? "").trim().toLowerCase();
  const genderText =
    gender === "female" ? "Female applicants only" : gender === "male" ? "Male applicants only" : null;

  let deadlineText = "N/A";
  if (job.deadline) {
    deadlineText = new Date(job.deadline).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  }

  const description = (job.description || "").trim();
  const teaser = description.length > 50 ? `${description.slice(0, 50)}...` : description;

  const detailLines = [
    `Salary: ${salaryText}`,
    `Type: ${escapeHtml(job.job_type || "Full Time")}`,
    `Openings: ${Number(job.quantity) || 1} position(s)`,
  ];
  if (experienceText) detailLines.push(`Experience: ${experienceText}`);
  if (genderText) detailLines.push(`Gender: ${genderText}`);
  detailLines.push(`Deadline: <b>${deadlineText}</b>`);

  return `🔸 <b>NEW VACANCY</b>

<b>${escapeHtml(businessName)}</b>
Job Title: <b>${escapeHtml(job.title)}</b>

${detailLines.join("\n")}${teaser ? `\n\n<i>${escapeHtml(teaser)}</i>` : ""}`;
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
await loadEnv();

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const CHAT_ID = Deno.env.get("TELEGRAM_GROUP_CHAT_ID");
const MINI_APP_URL = Deno.env.get("TELEGRAM_MINI_APP_URL");

if (!BOT_TOKEN || !CHAT_ID) {
  console.error("❌  Missing env vars. Add to prime-hospitality/.env.local:");
  console.error("    TELEGRAM_BOT_TOKEN=your_token");
  console.error("    TELEGRAM_GROUP_CHAT_ID=@hoteljobsinaddis");
  Deno.exit(1);
}

const message = buildMessage(SAMPLE_JOB, SAMPLE_BUSINESS);
const webAppUrl = MINI_APP_URL ? `${MINI_APP_URL}?startapp=job_${SAMPLE_JOB.id}` : null;
const replyMarkup = webAppUrl
  ? { inline_keyboard: [[{ text: "View Details / ዝርዝሩን ይመልከቱ", url: webAppUrl }]] }
  : undefined;

console.log("\n📤  Sending test message to:", CHAT_ID);
console.log("─────────────────────────────────────────");
console.log(message);
console.log("─────────────────────────────────────────\n");

const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ chat_id: CHAT_ID, text: message, parse_mode: "HTML", reply_markup: replyMarkup }),
});

const data = await res.json();

if (res.ok) {
  console.log("✅  Sent! Check your Telegram group. Message ID:", data?.result?.message_id);
} else {
  console.error("❌  Telegram API error:", data?.description);
}
