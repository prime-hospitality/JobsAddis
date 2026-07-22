# User Guide

## Job Seekers (Telegram Mini App)

1. **Open the bot in Telegram** and launch the Mini App.
2. **Onboarding** — register with name, age, location, willingness to relocate, phone
   number (optional to share), job categories of interest, and experience level. Upload
   a CV (PDF/Word, max 5MB) — stored in a private Supabase Storage bucket.
3. **Browse & search** — filter jobs by category, location, and experience level from
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
   (and optionally an experience level) to get notified when a matching job is posted.
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
