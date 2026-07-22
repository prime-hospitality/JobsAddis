# Admin Guide

Log in at `/admin`. There are two admin roles:

- **Super admin** — full access to every tab, can create/manage sub-admins. Username/
  password are stored in `app_config` (falls back to `admin`/`admin123` — **change this
  immediately after handover**, see [HANDOVER_CHECKLIST.md](HANDOVER_CHECKLIST.md)).
- **Sub-admin** — access limited to whichever permissions the super admin grants
  (`Overview` is always visible to everyone).

## Overview

Landing tab. Stat tiles (total employers, active job seekers, pending moderation, total
job posts), a per-employer job-posting bar chart, and a recent-activity feed.

## Employers & Companies

*Permission: `manageEmployers`*

- Approve / reject employer registrations.
- Add an employer manually (generates a one-time authorization number to share with
  them), optionally assigning a starting advertisement package.
- Edit an employer: business name/type, daily post limit, assign/change/extend their
  advertisement package, upload a logo.
- Delete an employer (requires admin password confirmation) — cascades to their jobs.

## Job Posting Moderation

*Permission: `manageJobs`*

- Browse jobs grouped by employer.
- Approve (Set Active) / Pause / Close a job posting.
- **Repost**: for a **closed or expired** job, opens a modal to pick a new deadline and
  publishes it as a brand-new active listing (the original row is left as-is for
  history — this is a clone, not a status flip, since the old deadline has already
  passed).

## Configuration

*Permission: `manageConfiguration`* — four sub-tabs:

- **Job Seeker Profiles** — search/view/ban/delete job seeker accounts.
- **Content Management** — manage FAQs (shown in the seeker app's Help & FAQ screen),
  vacancy templates (used to quickly post a pre-filled job), and onboarding welcome
  text.
- **Broadcast** — send an announcement to **Everyone**, **Job Seekers only**, or
  **Employers only**. Delivered as an in-app notification (bell icon) to each matching
  user — not a Telegram push message. Shows the 20 most recent broadcasts sent.
- **Activity Log** — read-only, paginated audit trail of privileged admin actions:
  employer approve/reject/delete, user ban/unban/delete, job status changes and
  reposts, package assignments, sub-admin creation/permission changes, and broadcasts
  sent. Each entry records who did it (`actor`), what (`action`), on what (`target`),
  and when.

## Monetization & Pricing

*Permission: `manageConfiguration`*

- Edit the advertisement package catalog shown on the public `/pricing` page and used
  when assigning packages to employers (name, duration, price, posts/day).
- Edit payment details shown on `/pricing` (bank name/account — packages are paid via
  manual bank transfer today; employers do not self-checkout, see note below).

## Reporting & Analytics

*Permission: `manageReports`* (new sub-admin permission — grant it explicitly to any
sub-admin who needs report access; the super admin always has it)

Pick a window (7/30/90 days). Shows:

- New job posts, total applications, average applications per job, and new signups in
  the window.
- Daily bar charts for signups and applications.
- Job posts broken down by category.
- **Package Performance**: currently-active subscriptions per package. This is a
  **snapshot of right-now**, not lifetime revenue — there's no historical purchase
  ledger, so a package's "value" here is `active subscriptions × price` at this moment.

## Settings (gear icon)

Super-admin only. Create/delete sub-admins and toggle which permissions each one has
(`manageEmployers`, `manageJobs`, `manageUsers`, `manageConfiguration`,
`manageReports`).

## Known gaps to flag to the client

- **Employer package selection is admin-driven, not self-service.** Employers see
  pricing and bank transfer details on `/pricing` and their own current plan on their
  billing page, but only an admin can actually assign/change their active package
  today. This was a deliberate scope decision for the 5-day sprint (employer
  registration is already handled manually) — building true self-checkout is future
  work if the client wants it.
