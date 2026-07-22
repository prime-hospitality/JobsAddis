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
│                   5 Deno Edge Functions (supabase/functions/)               │
│  validate-telegram-auth · telegram-webhook · send-telegram-notification     │
│  shortlist-applicant · job-expiration-cron                                  │
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
| `validate-telegram-auth` | Validates Telegram `initData` (HMAC), and is the seeker-facing API for almost everything: profile, jobs, applications, notifications, vacancy alerts |
| `telegram-webhook` | Receives raw Telegram Bot webhook updates (currently: contact/phone-number sharing) |
| `send-telegram-notification` | Sends a direct Telegram Bot API message to a user (currently disabled for applicant-facing notices — see code comments) |
| `shortlist-applicant` | Employer action to shortlist/reject an applicant |
| `job-expiration-cron` | Daily sweep: expires jobs/subscriptions past their deadline, sends 48h expiry-warning notifications (deduped per job). Scheduled via `pg_cron` (see migration `20260722020000`) |

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

## Scheduled jobs

`job-expiration-cron` runs daily at 06:00 UTC via Postgres `pg_cron` calling the deployed
function's HTTPS endpoint through `pg_net` (see migration `20260722020000_...`). The
function must be deployed (via the GitHub Actions workflow or manually) for the schedule
to have any effect — `pg_cron` will otherwise call a 404.
