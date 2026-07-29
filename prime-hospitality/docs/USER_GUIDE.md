# User Guide

## How experience works

Experience is recorded as a **number of years per role**, never as a seniority label
like "Junior" or "Senior".

Hospitality titles are relative to the property that awarded them. Two years at a large
hotel is that hotel's "junior accountant"; the same two years is a credible finance
manager at a small restaurant. A label therefore stops meaning anything the moment it
leaves the employer who wrote it, while a year count travels intact. Seekers state the
fact — how many years, and at what kind of establishment — and each employer applies
their own judgement to it.

Consequences worth knowing:

- Employers post a **minimum years** figure. Seniority wording belongs in the job title
  ("Senior Accountant"), which is the employer's own naming to make.
- When a seeker falls short of a job's minimum, the app shows an **advisory notice and
  nothing more** — the Apply button stays enabled. Someone below the stated minimum at
  a large property may be exactly the right hire at a smaller one, and that call belongs
  to the employer reading the application.
- A seeker who has not filled in a role sees no notice at all. Unknown is treated as
  unknown, not as zero.

## Job Seekers (Telegram Mini App)

1. **Open the bot in Telegram** and launch the Mini App.
2. **Onboarding** — register with name, age, location, willingness to relocate, phone
   number (optional to share), job categories of interest, and years of experience per
   role plus the kind of establishment those years were earned at. Upload
   a CV (PDF/Word, max 5MB) — stored in a private Supabase Storage bucket.
3. **Browse & search** — filter jobs by category, location, and years of experience from
   the Home/Search screens.
4. **Apply** — open a job's detail page and submit an application with an optional
   cover note. You get an on-screen confirmation, and the employer is notified
   in-app immediately.
5. **Track applications** — the Applications tab shows every job you've applied to and
   its current status.
6. **Notifications** — the bell icon shows updates: application status changes,
   vacancy alerts matching your subscribed categories, and any admin announcements
   (broadcasts).
7. **Vacancy alerts** — in Profile → Notification settings, subscribe to categories
   (and optionally a cap on how many years a job may ask for) to get notified when a
   matching job is posted.
8. **Help & FAQ** — Profile → Help & FAQ for common questions and support contact info
   (content managed by the admin team, so it can be updated without a code change).

## Employers (web dashboard, `/emp`)

1. **Registration** — handled manually by the admin team today: contact the admin to
   get an account created, which generates a one-time authorization number used to log
   in and set a password.
2. **Company profile** — set your business name, type, and upload a logo.
3. **Post a job** — create a vacancy with title, category, location, salary,
   description, requirements, and deadline. New posts publish to the connected
   Telegram group/channel automatically once approved.
4. **Advertisement packages** — your posting limit (jobs/day) and how long posts stay
   live depend on your active package. Packages and pricing are shown on the public
   `/pricing` page; payment is by bank transfer, and an admin assigns/activates your
   package after payment is confirmed (there is no online checkout yet).
5. **Review applicants** — the Applicants tab lists everyone who applied to your jobs,
   with CV download, filtering, and shortlist/decline actions.
6. **Repost an expired posting** — if one of your jobs closes or expires, ask the admin
   team to repost it with a fresh deadline (self-service reposting is an admin-only
   action today).
7. **Notifications** — the bell icon in your dashboard shows: new applicants, jobs
   expiring within 48 hours, subscription expiry, and any admin announcements.
8. **Billing** — your Billing page shows your current plan and expiry date, with a link
   to the pricing page to request an upgrade (again, activated by an admin after
   payment).
