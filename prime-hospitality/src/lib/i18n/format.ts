import { en } from "./en";
import { am } from "./am";
import type { Lang } from "./types";

/**
 * Locale-aware formatting. These take an explicit `lang` rather than reading
 * context, so they can be called from plain helpers as well as components.
 *
 * Dates stay Gregorian — the Ethiopian calendar is deliberately out of scope,
 * since job deadlines are stored as UTC timestamps set by employers.
 */

const TIME_STRINGS = { en: en.time, am: am.time } as const;

function timeString(lang: Lang, key: keyof typeof en.time, count?: number): string {
  const template = TIME_STRINGS[lang]?.[key] ?? en.time[key];
  return count === undefined ? template : template.replace("{count}", String(count));
}

/**
 * Relative timestamp: "just now" / "5m ago" / "Yesterday" / "3w ago".
 * Replaces five identical copies that previously lived in the screen files.
 */
export function timeAgo(dateStr: string, lang: Lang): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return timeString(lang, "justNow");
  if (mins < 60) return timeString(lang, "minutesAgo", mins);
  if (hours < 24) return timeString(lang, "hoursAgo", hours);
  if (days === 1) return timeString(lang, "yesterday");
  if (days < 7) return timeString(lang, "daysAgo", days);
  return timeString(lang, "weeksAgo", Math.floor(days / 7));
}

const DATE_LOCALE: Record<Lang, string> = { en: "en-US", am: "am-ET" };

/** Absolute date, e.g. "Mar 4, 2026" / "መጋ 4, 2026". Falls back to the raw input. */
export function formatDate(dateStr: string, lang: Lang): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(DATE_LOCALE[lang], {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/** Grouped number, e.g. "12,000". Currency stays ETB in both languages. */
export function formatNumber(value: number, lang: Lang): string {
  try {
    return value.toLocaleString(DATE_LOCALE[lang]);
  } catch {
    return String(value);
  }
}
