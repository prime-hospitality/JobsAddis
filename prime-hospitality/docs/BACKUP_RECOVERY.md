# Backup & Recovery

## What's backed up automatically

Supabase provides platform-level backups for the Postgres database:

- **Daily backups** are included on all paid Supabase plans, retained per the project's
  plan tier (check **Project Settings → Add-ons → Backups** in the Supabase dashboard
  for the current retention window).
- **Point-in-Time Recovery (PITR)**, if enabled on the project's plan, allows restoring
  to any specific timestamp rather than only a daily snapshot — recommended given this
  is a production system handling live employer/applicant data.
- These backups cover the **database only** — not Storage buckets (CVs, logos) and not
  edge function code (that lives in this Git repository instead).

Confirm the current plan's backup/PITR settings during handover — see
[HANDOVER_CHECKLIST.md](HANDOVER_CHECKLIST.md).

## Manual database export (recommended before any risky migration)

Using the Supabase CLI, linked to the project:

```bash
npx supabase link --project-ref <project-ref>
npx supabase db dump --file backup_$(date +%Y%m%d).sql
```

Or with `pg_dump` directly against the connection string from **Project Settings →
Database**:

```bash
pg_dump "postgresql://postgres:<password>@<host>:5432/postgres" -F c -f backup.dump
```

## Restoring

- **From a Supabase platform backup**: Supabase dashboard → **Database → Backups** →
  select a restore point. This is a full-project restore — coordinate downtime and
  confirm the target date/time carefully, since anything written after the restore
  point is lost.
- **From a manual `pg_dump` file**:
  ```bash
  pg_restore -d "postgresql://postgres:<password>@<host>:5432/postgres" backup.dump
  ```
- **Storage buckets** (`resumes`, `logos`) have no built-in point-in-time restore —
  there is currently no automated export of these files. If storage-level backup is a
  requirement, set up a periodic sync (e.g. `supabase storage` API or a scheduled job)
  to mirror the buckets to another storage provider.

## Data protection already in place

- Deleting a `users` row cascades to `profiles`, `applications`, `employers`, and
  `jobs` (enforced via `ON DELETE CASCADE` foreign keys) — this prevents orphaned
  records but means **user deletion is destructive and unrecoverable without a
  database restore**. Think before confirming a delete in the admin dashboard.
- Row Level Security (RLS) is enabled on all tables; only the service-role key
  (server-side only, never exposed to the browser) can bypass it.

## Recommended cadence

- Rely on Supabase's daily backups + PITR for routine protection.
- Take a manual `db dump` before running any new migration by hand outside the normal
  `supabase db push` flow, and before any bulk data operation (e.g. mass user cleanup).
