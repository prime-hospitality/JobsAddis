# Backup & Recovery

Delivered under Agreement §17.E (*Backup functionality and data protection measures*)
and §17.F (*User guide and backup and recovery procedures*).

## ⚠️ Read this first: what the current plan does and does not give you

This project runs on the **Supabase Free plan**, which includes **no automated database
backups and no Point-in-Time Recovery**. There is no platform snapshot to restore from.

That means:

- If the database is lost, corrupted, or someone deletes the wrong record, **Supabase
  cannot recover it for you.**
- The only recoverable copy is the off-platform backup described below.
- Free projects are also **paused after 7 days without activity**, which takes the app
  offline until someone resumes them from the dashboard.

Upgrading to **Pro (~$25/month)** adds daily backups with 7-day retention, removes the
inactivity pause, and makes PITR available as an add-on. For a live system holding
applicant CVs and personal data this is strongly recommended, but the procedures below
are written to work without it.

## What gets backed up, and where

| Data | Where it lives | Covered by |
|---|---|---|
| Database (users, profiles, employers, jobs, applications, config, logs) | Supabase Postgres | Nightly automated dump (below) |
| **CVs and employer logos** | Supabase **Storage** buckets | Nightly automated sync (below) |
| Source code, migrations, edge functions | This Git repository | GitHub |
| Bot token, service role key, admin password | Supabase secrets / `app_config` | **Nothing** — see *Credentials* below |

Storage buckets are worth calling out: **no Supabase backup covers them on any plan.**
A database-only restore would bring back `cv_url` values pointing at files that no
longer exist, so the CVs must be backed up separately or applicant documents are lost
permanently.

## Automated nightly backup

`.github/workflows/backup.yml` runs every night at 02:00 UTC and can also be triggered
by hand from the Actions tab. Each run:

1. `pg_dump`s the whole database to a timestamped, gzipped SQL file.
2. Syncs the `resumes` and `logos` Storage buckets (new and changed files only).
3. Commits both into the private backup repository
   **[`prime-hospitality/backupadisjobs`](https://github.com/prime-hospitality/backupadisjobs)**.
4. Prunes database dumps older than 30 days. Storage files are never pruned — they are
   the only copy of applicant CVs, and a CV uploaded months ago is still current.

Restoring is therefore always possible from a plain `git clone` of that repo — no
Supabase plan feature required.

> **The backup repository must stay private.** It contains applicant CVs, phone numbers
> and full contact details. Making it public would be a data breach under §11 (Data
> Protection), not merely an untidy configuration.

### Required GitHub secrets

Set on the **source** repository (`prime-hospitality/JobsAddis`) under
**Settings → Secrets and variables → Actions**:

| Secret | Where to find it |
|---|---|
| `SUPABASE_DB_URL` | Supabase → Project Settings → Database → Connection string (URI) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API |
| `SUPABASE_URL` | Supabase → Project Settings → API |
| `BACKUP_REPO_TOKEN` | A GitHub personal access token with `repo` scope that can push to the backup repository |

The destination repo is hardcoded as a default in the workflow. To move it, set a
`BACKUP_REPO` repository **variable** (not a secret) to the new `owner/name`.

## Manual export

### On demand, from the admin dashboard

**Admin → Reporting → Export Data** downloads CSVs of the core business tables (users,
profiles, employers, jobs, applications). Best for reporting, spot-checks, and giving
the Client a copy of their own data on request (§3, §11). It is *not* a substitute for
the nightly dump — it excludes Storage files and cannot be restored automatically.

### Before any risky change

Take a full dump by hand before running a new migration outside the normal
`supabase db push` flow, or before any bulk operation such as a mass user cleanup:

```bash
cd prime-hospitality
npx supabase link --project-ref <project-ref>
npx supabase db dump --file backup_$(date +%Y%m%d).sql
```

Or with `pg_dump` directly, using the connection string from **Project Settings →
Database**:

```bash
pg_dump "postgresql://postgres:<password>@<host>:5432/postgres" -F c -f backup.dump
```

## Restoring

**From the nightly backup (the normal path on this plan):**

```bash
git clone <private-backup-repo>
cd <private-backup-repo>
gunzip -c db/backup_YYYYMMDD.sql.gz | psql "postgresql://postgres:<password>@<host>:5432/postgres"
```

Then re-upload the storage folder to the matching buckets via the Supabase dashboard or
the Storage API. Restore the database first — the buckets are keyed by paths the
database rows refer to.

**From a manual `pg_dump` file:**

```bash
pg_restore -d "postgresql://postgres:<password>@<host>:5432/postgres" backup.dump
```

**From a Supabase platform backup:** not available on the Free plan. If the project is
upgraded to Pro, this becomes Supabase dashboard → **Database → Backups** → select a
restore point. That is a full-project restore, so coordinate downtime and confirm the
target timestamp carefully — anything written after the restore point is lost.

## Credentials are not backed up

A database restore is useless without the keys needed to run the system. The bot token,
service role key, and admin password live only in Supabase secrets and `app_config`, and
no backup captures them. Keep the filled-in
[HANDOVER_CHECKLIST.md](HANDOVER_CHECKLIST.md) somewhere safe and offline — that document
is part of the recovery procedure, not just paperwork.

## Data protection already in place

- Deleting a `users` row cascades to `profiles`, `applications`, `employers`, and
  `jobs` (`ON DELETE CASCADE`). This prevents orphaned records but makes user deletion
  **destructive and unrecoverable except from a backup** — and on the Free plan, only
  from the nightly backup below. Think before confirming a delete in the admin
  dashboard.
- Row Level Security is enabled on all tables; only the service-role key (server-side
  only, never exposed to the browser) can bypass it.
- The `resumes` bucket is **private** (migration `20260725120000`). CVs are served only
  through short-lived signed URLs, never a public link.

## Recommended cadence

| When | Action |
|---|---|
| Nightly, automatic | GitHub Actions dump + storage sync (no action needed) |
| Before any manual migration or bulk data change | Manual `db dump` |
| Monthly | Confirm the backup workflow is still succeeding, and actually test a restore into a scratch project — an untested backup is not a backup |
| At handover, and after any credential rotation | Update `HANDOVER_CHECKLIST.md` |
