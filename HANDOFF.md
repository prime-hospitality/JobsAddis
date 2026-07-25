# Handoff — apply flow fix + employer applicant tracking

Branch: `fix/apply-flow-and-applicant-tracking` (commit `59a0368`)

```bash
git fetch
git checkout fix/apply-flow-and-applicant-tracking
cd prime-hospitality && npm install
```

You'll need `prime-hospitality/.env.local` on the new machine — it's gitignored, so copy it
across manually. It needs `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`.

---

## What was fixed

**The bug you reported.** Back from the submit-application screen sent the seeker back to
the submit screen. Cause: `handleApply` didn't go to the form, it went to
`ProfileCheckScreen` — an invisible checkpoint that compared experience against the job's
requirement and, when the seeker qualified (the normal case), rendered nothing and forwarded
them to the form. Back targeted that checkpoint, which re-mounted, re-checked, and forwarded
again. Only exits were submitting or closing the app.

Per your decision the qualification gate is **removed entirely**. Apply → form, back → job.
That also deleted the in-flow profile builder, which built a profile without ever saving it
and guaranteed a "Profile not found" error at submit.

**Seeker flow also got:** "Applied ✓" state on jobs already applied to; closed/past-deadline
jobs blocked (server-side and in the UI); the 300-char cover note limit made real (it was
display-only); cover note kept when stepping back to re-read the job.

**Employer applicant tracking** — `/emp/dashboard/applicants` was a 17-line "Coming Soon"
stub. Now: job filter, All/Shortlisted/Declined tabs with counts, name search, applicants
ranked by profile completeness, detail panel with phone, secondary phone, location, roles +
experience, **cover note** (written by seekers, stored, and displayed nowhere until now), CV
link, and Shortlist/Decline/Undo. Opening an applicant marks them Reviewed. Per-job counts
link in from the Jobs tab, overview rows are clickable, sidebar has an unopened badge.
Shortlisting notifies the seeker; declining stays silent.

**Security.** Any employer could read *any* employer's applicants — names, phone numbers, CV
links — because `get_job_applicants` loaded the caller's employer id and never used it. Same
class of hole let any employer shortlist/decline anyone's applicants. Both scoped now. Also:
`shortlist-applicant` skipped signature validation entirely if `TELEGRAM_BOT_TOKEN` was unset
and assumed a hardcoded user — now fails closed. And the `resumes` bucket is made private,
with CVs served via 5-minute signed URLs to the owning seeker and the employer they applied to.

---

## ⚠️ DO THIS IN ORDER

Nothing server-side is live yet. Pushing code did not deploy the edge functions or the migration.

### 1. Deploy edge functions — do this first

```bash
cd prime-hospitality
supabase functions deploy validate-telegram-auth
supabase functions deploy shortlist-applicant
```

Backwards compatible. Adds the `get_own_cv_url` action plus all the guards. Nothing breaks.

### 2. Deploy the app

Now "View CV" goes through a signed URL. Signed URLs work against a public bucket, so this is
still safe.

> Mildly one-way: after this, CV uploads store a bare storage path instead of a full URL. Roll
> the front-end back and those users' "View CV" breaks. Fixable forward in a minute.

### 3. Run the migration — last

```bash
supabase db push
```

Verified: every migration through `20260725000000` is already applied, so
`20260725120000_make_resumes_private.sql` is the **only** pending one. Nothing unexpected runs.

**Do not run the migration before steps 1–2.** Today the only live CV surface is the seeker's
own profile screen doing `window.open(cv_url)` on a public URL. Make the bucket private first
and that breaks for every seeker until the new code is out. No urgency on step 3 either — the
bucket being public is the existing state of the app, not something this branch introduced.

---

## How to actually test it

**The applications table is empty — 0 rows.** Nothing in this has been exercised end to end,
by me or anyone. The employer page will render its empty state until data exists.

1. **Apply to a job from Telegram, as yourself.** Live jobs: *TELEPHONE OPERATOR* (illy
   Coffee) or *IT Officer* (Addis Jobs). One application is enough; a couple across both
   employers is better because it also proves the scoping with real data.
2. **Seeker checks** — back from the form returns to the job (both the Telegram arrow and the
   in-app arrow); reopening the job shows "Applied ✓"; the cover note survives going back and
   forward; pasting >300 chars is capped.
3. **Employer checks** — `npm run dev`, log in at `/emp/dashboard`, open Applicant Tracking.
   Check the cover note renders and "View CV" opens the file.
4. **Shortlist yourself** — closes the whole loop: you should see the "shortlisted"
   notification arrive in the mini app. Decline should stay silent.

---

## Verified vs. not

**Verified:** type-checks clean, production build passes. Against the live database I confirmed
the employer-scoping filter genuinely scopes (returned 1 of 4 jobs, not all 4 — the failure
mode would have been a silent no-op leaving the hole open), that every column the applicant
queries select exists, and that CV path resolution + signing work on your real stored values
(they're legacy public URLs; `resumeStoragePath` handles both formats, so **no data migration
is needed**).

**Not verified:** anything end to end. No UI has been clicked. The seeker flow has never run.

---

## Loose ends (not in this branch)

- **`profiles.alert_categories` exists on the live DB but no migration creates it** — added by
  hand at some point. Works today, but the migrations folder can no longer rebuild the database
  from scratch. Worth a catch-up migration.
- **`employer_session` is an unsigned plain-JSON cookie containing `employerId`**
  (`src/app/emp/actions.ts`). Forging it grants full employer access — including to everything
  built here. Should be signed or encrypted.
- **`markNotificationAsRead`** has no session or ownership check.
- The Telegram employer screens (`ApplicantManagementScreen`, `ApplicantProfileView`) remain
  orphaned — no route reaches them — per the decision to put tracking on the web. Their CV
  link is neutered with a comment explaining what it needs if revived.
- A transient `fetchProfile` failure sets `isOnboarded = false` (`src/app/page.tsx`), pushing
  an already-onboarded user back into onboarding.
- Delete this file once you're picked up.
