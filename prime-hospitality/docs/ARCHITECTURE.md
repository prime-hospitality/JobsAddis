# Architecture

## Overview

JobsAddis is a Telegram Mini App recruitment platform with three user-facing surfaces
and a shared Supabase backend:

```
┌─────────────────────┐   ┌──────────────────────┐   ┌──────────────────────┐
│  Job Seeker Mini App │   │  Employer Dashboard   │   │   Admin Dashboard     │
│  (Telegram WebView)  │   │  (web, /emp)          │   │   (web, /admin)       │
└──────────┬───────────┘   └──────────┬───────────┘   └──────────┬───────────┘
           │ Telegram initData             │ cookie session           │ cookie session
           ▼                               ▼                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Next.js 16 App (App Router)                        │
│  src/app/(seeker pages) · src/app/emp · src/app/admin · Server Actions      │
└───────────────────────────────────┬───────────────────────────────────────-┘
                                     │ supabase-js (service role for server code)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Supabase Project                               │
│  Postgres + RLS · Storage (resumes, logos) · pg_cron + pg_net               │
└───────────────────────────────────┬───────────────────────────────────────-┘
                                     │ HTTPS
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   4 Deno Edge Functions (supabase/functions/)               │
│  validate-telegram-auth · telegram-webhook                                  │
│  shortlist-applicant · job-expiration-cron   (+ _shared/telegram.ts)        │
└───────────────────────────────────┬───────────────────────────────────────-┘
                                     │ Bot API
                                     ▼
                            ┌─────────────────┐
                            │  Telegram Bot    │
                            └─────────────────┘
```

## Three surfaces, one app

The Next.js app serves all three experiences from one codebase:

- **Job seeker** (`src/app/page.tsx`, `src/screens/*`): runs inside Telegram as a Mini
  App. Authenticates via Telegram `initData`, validated server-side by the
  `validate-telegram-auth` edge function (which also acts as the seeker-facing API —
  action-routed: `submit_application`, `get_notifications`, etc.).
- **Employer dashboard** (`src/app/emp/*`): a normal web app, session-based (httpOnly
  cookie set on login), calling Next.js **Server Actions** in `src/app/emp/actions.ts`
  directly (no edge function involved).
- **Admin dashboard** (`src/app/admin/*`): same pattern as the employer dashboard —
  cookie session + Server Actions in `src/app/admin/actions.ts`. Supports a super-admin
  and permissioned sub-admins (`AdminPermissions`: `manageEmployers`, `manageJobs`,
  `manageUsers`, `manageConfiguration`, `manageReports`).

## Edge functions (`supabase/functions/`)

| Function | Purpose |
|---|---|
| `validate-telegram-auth` | Validates Telegram `initData` (HMAC), and is the seeker-facing API for almost everything: profile, jobs, applications, notifications, vacancy alerts. See [API.md](API.md) |
| `telegram-webhook` | Receives raw Telegram Bot updates: `/start` and `/help` (replies with a button that opens the Mini App) and contact/phone-number sharing |
| `shortlist-applicant` | Employer action to shortlist/reject an applicant |
| `job-expiration-cron` | The every-minute platform sweep — see [Scheduled jobs](#scheduled-jobs) below |
| `_shared/telegram.ts` | Not a function. Shared Bot API helpers (DM send, fan-out throttling, Mini App deep links) imported by the others and bundled into each at deploy time |

## Data model (key tables)

- `users` — core identity (`telegram_id`, `role`: job_seeker/employer/admin)
- `profiles` — job seeker profile (CV, categories, alert preferences)
- `employers` — company profile, verification status, active package/expiry
- `jobs` — vacancy postings (`status`: pending/active/closed/rejected/expired/scheduled)
- `applications` — seeker → job applications
- `packages` — advertisement package catalog (duration, price)
- `notifications` — single shared table for all in-app notifications (seeker and
  employer), disambiguated by `type` (`shortlisted`, `rejected`, `vacancy_alert`,
  `job_expiring`, `subscription_expired`, `new_applicant`, `broadcast`, `message`)
- `activity_log` — admin privileged-action audit trail (actor, action, target, metadata)
- `app_config` — key/value store for admin credentials, sub-admin list, pricing config
- `vacancy_templates`, `faqs` — content managed via the admin Content Management tab

Full column-level detail lives in `supabase/migrations/` (applied in filename order).

## Notification system

All notifications — seeker and employer — share one `notifications` table. There's no
`employer_id` column; rows are addressed by `user_telegram_id` and disambiguated by
`type`. This means adding a new notification kind is a two-step change: extend the
`notifications_type_check` constraint (see the migration pattern in
`20260721215925_add_packages_and_expiration.sql` and `20260722020000_...cron.sql`), then
add a rendering branch in both `src/components/NotificationPanel.tsx` (seeker) and
`src/app/emp/dashboard/EmployerDashboardLayout.tsx` (employer) — they are two separate,
unmerged UI implementations reading the same table.

### Delivery: in-app row + Telegram DM

A Mini App has no push channel of its own — it only exists while the user has it open —
so a **bot DM is the only way to reach someone who isn't currently looking at the app.**

The table row is the source of truth. Code that creates a notification only inserts the
row; it never sends. A **dispatcher inside `job-expiration-cron` sweeps every minute**
and sends the DM. Delivery is centralised there rather than fired from each call site
for two reasons:

- **`deliver_after`** — a shortlist notice is held for a 5-minute undo window
  (`20260726000000`). A DM sent at click time could not be taken back.
- **Idempotency** — `dm_sent_at` (`20260727030000`) marks a row dispatched, so an
  overlapping or retried sweep can't message the same person twice.

Only three types earn a DM: `vacancy_alert`, `shortlisted`, `broadcast`. Everything else
is in-app only, deliberately — a muted or blocked bot costs us the alerts that do matter.
To add a type to the set, extend `DM_ELIGIBLE_TYPES` and `buildDmText` in
`job-expiration-cron/index.ts`.

Rows are marked dispatched whether or not the send succeeded. A user who has blocked the
bot or never started a chat with it is a permanent failure, not something to retry every
minute forever — and in a Mini App that case is normal, since a user can arrive from a
channel link without ever opening a chat with the bot.

## Scheduled jobs

`job-expiration-cron` runs **every minute** via Postgres `pg_cron`, calling the deployed
function's HTTPS endpoint through `pg_net`. It was originally daily at 06:00 UTC; the
schedule changed in `20260723000000` so scheduled posts go live on their scheduled minute
rather than sitting unresolved for up to 24 hours. The pg_cron entry keeps its historical
name `job-expiration-cron-daily` (the schedule upserts by name), which is now a misnomer.

Despite its name the function is the general platform sweep. Each run:

1. Publishes `scheduled` jobs whose time has passed — straight to `active` if the
   employer has `auto_publish` or the job was pre-approved, otherwise to `pending`
2. Expires jobs belonging to employers whose package has lapsed
3. Expires jobs past their own deadline
4. Sends 48h job-expiry warnings (deduped per job)
5. Sends 24h subscription-expiry warnings (once per cycle, gated by `expiry_warning_sent`)
6. Dispatches pending Telegram DMs (see above)

The function must be deployed for the schedule to have any effect — `pg_cron` will
otherwise call a 404 every minute.
