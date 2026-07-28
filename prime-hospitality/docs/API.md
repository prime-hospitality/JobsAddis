# API Reference

Delivered under Agreement §7 (*Source Code Delivery — API documentation*).

The Mini App has no REST API of its own. Every job-seeker and employer-in-Telegram
request goes to **one action-routed Edge Function**, `validate-telegram-auth`, plus a
second small one for applicant decisions. The employer web dashboard (`/emp`) and admin
dashboard (`/admin`) do **not** use these endpoints — they call Next.js Server Actions
directly (`src/app/emp/actions.ts`, `src/app/admin/actions.ts`) over a cookie session.

---

## Transport

```
POST https://<project-ref>.supabase.co/functions/v1/validate-telegram-auth
POST https://<project-ref>.supabase.co/functions/v1/shortlist-applicant
```

**Headers (all requests):**

| Header | Value | Purpose |
|---|---|---|
| `Content-Type` | `application/json` | — |
| `Authorization` | `Bearer <SUPABASE_ANON_KEY>` | Passes the Supabase API gateway. Not the security boundary — the anon key is public. |
| `x-telegram-init-data` | Raw Telegram `initData` string | **This is the security boundary.** Verified by HMAC-SHA256 against `TELEGRAM_BOT_TOKEN` before any action runs. |

The caller's identity is taken from the *verified* `initData`, never from the request
body — a client cannot act as another user by passing someone else's id.

> **Token coupling:** `initData` is signed by the bot that served the Mini App. If
> `TELEGRAM_BOT_TOKEN` and the bot serving the app ever diverge, every request fails
> `401`. This is the main hazard when switching bots.

**Body:** `{ "action": "<name>", ...payload }`

All clients should go through `src/lib/api.ts`, which attaches the headers and throws a
typed `ApiError` carrying `statusCode` (with `isRateLimit` / `isUnauthorized` /
`isDuplicate` helpers).

### Status codes

| Code | Meaning |
|---|---|
| `200` | Success. Body is `{ success: true, ... }` or the requested data. |
| `400` | Missing or invalid payload field. |
| `401` | `initData` missing, malformed, or failed HMAC verification. |
| `403` | Authenticated, but not the owner of the target resource (e.g. another employer's applicant), or banned. |
| `404` | Target record not found. |
| `409` | Duplicate — already applied to this job. |
| `429` | Rate limited. |
| `500` | Unhandled server error. |

Errors return `{ "error": "<human-readable message>" }`.

### Rate limits

| Scope | Limit |
|---|---|
| Application submissions | 10 per hour per `telegram_id` (`429` beyond) |

---

## `validate-telegram-auth` actions

### Profile

| Action | Payload | Returns |
|---|---|---|
| `create_profile` | `profileData`, `cvUrl?` | `{ success }` — creates `users` + `profiles` rows and completes onboarding |
| `get_profile` | — | Full profile, including `alert_categories` and `alert_experience_level` |
| `update_cv` | `cvUrl` | `{ success }` — replaces the stored CV; the previous file is removed from storage |
| `update_phone` | `phoneNumber` | `{ success }` |
| `update_secondary_phone` | `secondaryPhone` | `{ success }` |
| `get_own_cv_url` | — | `{ url }` — short-lived signed URL. The `resumes` bucket is private (`20260725120000`), so CVs are never served from a public URL |
| `update_alert_categories` | `categories: string[]`, `experience_level: string \| null` | `{ success }` — the vacancy-alert subscription |

### Jobs & applications (seeker)

| Action | Payload | Returns |
|---|---|---|
| `submit_application` | `jobId`, `coverNote?` | `{ success }`. `409` if already applied, `429` past 10/hour |
| `get_applications` | — | The seeker's applications with joined job and employer detail |

### Employer-in-Telegram

These serve employers using the Telegram surface. The `/emp` web dashboard uses Server
Actions instead, so most employer traffic never reaches these.

| Action | Payload | Returns |
|---|---|---|
| `get_employer_dashboard` | — | Employer profile, jobs, and applicant counts |
| `post_job` | `jobData` | `{ success }`. Also announces to the Telegram channel and queues `vacancy_alert` notifications for matching subscribers |
| `edit_job` | `jobId`, `jobData` | `{ success }` |
| `delete_job` | `jobId` | `{ success }` |
| `get_job_applicants` | `jobId` | Applicants for one job. `403` unless the job belongs to the caller |
| `update_employer_logo` | `logoUrl` | `{ success }` |

### Notifications

| Action | Payload | Returns |
|---|---|---|
| `get_notifications` | — | Delivered notifications only — rows with a future `deliver_after` are hidden |
| `mark_notifications_read` | — | `{ success }` |
| `get_unread_count` | — | `{ unread_count }` — excludes undelivered rows |

Creating a notification never sends the Telegram DM inline; a dispatcher in
`job-expiration-cron` does that. See [ARCHITECTURE.md](ARCHITECTURE.md#delivery-in-app-row--telegram-dm).

---

## `shortlist-applicant` actions

Separate function because it is the one employer action reachable from both surfaces.
All three verify the application belongs to one of the caller's own jobs — without that
check, any employer could act on another's applicants by guessing an application id.

| Action | Payload | Effect |
|---|---|---|
| `shortlist` | `applicationId` | Status → `shortlisted`. Queues a `shortlisted` notification with `deliver_after` set **5 minutes out**, so a misclick can be undone before the seeker is told anything |
| `decline` | `applicationId` | Status → `declined`. **Silent by design** — no notification, no DM |
| `unshortlist` | `applicationId` | Status → `reviewed`. Deletes the pending notice if still inside the 5-minute window; a delivered one is left alone rather than silently retracted |

---

## `telegram-webhook`

Not called by the app — Telegram calls it. Register with:

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<project-ref>.supabase.co/functions/v1/telegram-webhook"
```

Handles `/start` (optionally with a `startapp` deep-link payload), `/help`, any other
text (replies with a button opening the Mini App), and shared contacts (captures the
phone number into `telegram_contacts` and `profiles`).

**The webhook is bound to the bot token.** After switching bots, `setWebhook` must be
re-run against the new bot or updates silently stop arriving.

---

## `job-expiration-cron`

Invoked every minute by `pg_cron` via `pg_net`, authenticated with the service role key.
Takes no payload. Returns a summary of the sweep:

```json
{
  "success": true,
  "publishedCount": 0, "sentToReviewCount": 0,
  "expiredEmployerJobsCount": 0, "expiredDeadlineCount": 0,
  "warningsSent": 0, "subscriptionExpiryWarningsSent": 0,
  "dmAttempted": 0, "dmSent": 0
}
```

See [ARCHITECTURE.md](ARCHITECTURE.md#scheduled-jobs) for what each step does.
