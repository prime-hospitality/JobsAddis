# Handover Checklist & Credentials Register

**Project:** JobsAddis — Telegram Recruitment Mini App
**Client:** Addis Ababa Hotel Associates Union / Prime Hospitality Business Group P.L.C.
**Prepared:** 28 July 2026

Per Agreement §6 (Hosting and Infrastructure Ownership) and §17.F (Final Handover
Requirements). Nothing here is withheld, and every account listed is owned by the
Client, not the Developer.

> **This document is part of the recovery procedure, not just paperwork.** A database
> restore is useless without the access listed here. Keep a copy somewhere safe and
> offline. It deliberately records *where* each credential lives rather than the secret
> values themselves — no passwords or keys are written into this file.

---

## 1. Ownership status

Every account below was created **directly under the Client's email address**, so there
is no ownership transfer pending — the Client has owned these from the outset.

| Asset | Location | Owner | Status |
|---|---|---|---|
| Source code | [github.com/prime-hospitality/JobsAddis](https://github.com/prime-hospitality/JobsAddis) | Client org | ✅ Client-owned |
| Backups | [github.com/prime-hospitality/backupadisjobs](https://github.com/prime-hospitality/backupadisjobs) — **private** | Client org | ✅ Client-owned |
| Database, storage, functions | Supabase project `rrypxbkipixmuufzkdxp` (eu-west-1) | Client account | ✅ Client-owned |
| Web hosting | Vercel — auto-deploys from `main` | Client account | ✅ Client-owned |
| Telegram bot | `@Addisjobsdemobot` | Client account | ⚠️ Confirm BotFather ownership |
| Telegram group | `@Addisjobsgrp` | Client account | ✅ Client-owned |

**Outstanding:** confirm the bot sits under a Client-controlled Telegram account
(BotFather → `/mybots` → Transfer Ownership), then rotate `TELEGRAM_BOT_TOKEN` so no
copy held by the Developer remains valid. Note the bot's display name still reads
"demobot" — renaming it in BotFather is cosmetic and does not affect the token or any
configuration.

## 2. Where each credential lives

Three separate stores. Nothing belongs in more than one place except where noted.

### Vercel → Project Settings → Environment Variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret.** Bypasses row-level security |
| `ADMIN_PASSWORD` | **Secret.** Fallback only — a real password is set in `app_config` |
| `IDP_PASSWORD` | **Secret.** Internal `/idp` developer page |

### Supabase → Edge Functions → Secrets

| Variable | Purpose |
|---|---|
| `TELEGRAM_BOT_TOKEN` | **Secret.** Signs Mini App logins and sends all bot messages |
| `TELEGRAM_MINI_APP_URL` | `https://t.me/Addisjobsdemobot/hoteljobs` |
| `TELEGRAM_GROUP_CHAT_ID` | `@Addisjobsgrp` |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret.** Same key as Vercel — the one genuine overlap |

### GitHub → JobsAddis → Settings → Secrets and variables → Actions

| Variable | Purpose |
|---|---|
| `SUPABASE_DB_URL` | **Secret.** Postgres connection string used by the nightly backup |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | **Secret.** Storage backup |
| `BACKUP_REPO_TOKEN` | **Secret.** GitHub token that pushes into the backup repo |
| `SUPABASE_ACCESS_TOKEN` | **Secret.** Deploys edge functions on push to `main` |

### Admin dashboard

Super-admin username and password are stored **hashed (bcrypt) in the `app_config`
table**, not in an environment variable. A real password is set — the built-in
`admin` / `admin123` fallback is not in use. Change it after handover from
**Admin → Settings**, and review the sub-admin list for any accounts created for
development.

## 3. Critical operational notes

**The bot token signs Mini App logins.** Telegram `initData` is HMAC-signed with
`TELEGRAM_BOT_TOKEN`. If that token is rotated, or the Mini App is served from a
different bot, **every job seeker's login fails instantly**. Token and Mini App must
always match. Rotate deliberately, and redeploy the edge functions afterwards.

**Supabase is on the Free plan.** There are no platform backups and no
Point-in-Time Recovery. The nightly GitHub Actions backup is the *only* recoverable
copy of the data. Free projects also pause after 7 days of inactivity, taking the app
offline until manually resumed. Upgrading to Pro (~$25/month) resolves both. See
[BACKUP_RECOVERY.md](BACKUP_RECOVERY.md).

**Deleting a user is unrecoverable.** Removing a user cascades to their profile,
applications and jobs. On the Free plan the only way back is the nightly backup.

**Edge functions deploy automatically** on push to `main` via
`.github/workflows/deploy-functions.yml`. Migrations do **not** — apply them with
`npx supabase db push`. When a function reads a column a migration adds, push the
migration first.

## 4. Accepted scope decisions

Two items in §17 were delivered differently from the literal wording, by agreement.
Both should be initialled by the Client at acceptance so they are not later read as
undelivered:

| § | As written | As delivered | Initial |
|---|---|---|---|
| 17.B.4 | Advertisement package selection and duration setup | Packages are assigned by an administrator; employers view their plan and request renewal, payment handled offline by bank transfer | ☐ |
| 17.B.2 | Employer verification workflow | Employers are vetted and registered directly by an administrator, who issues a 5-digit authorisation code — there is no self-service signup awaiting approval | ☐ |

## 5. Final acceptance (§17.F)

| Requirement | Status |
|---|---|
| Complete source code + Git repository under Client ownership | ✅ |
| Database scripts and structure (`supabase/migrations/`) | ✅ |
| Hosting deployment files and Telegram Bot configuration | ✅ Documented in §2 above |
| Technical documentation | ✅ [ARCHITECTURE.md](ARCHITECTURE.md), [API.md](API.md) |
| Administrator training | ☐ **Outstanding — session to be delivered** |
| User guide | ✅ [USER_GUIDE.md](USER_GUIDE.md) |
| Backup and recovery procedures | ✅ [BACKUP_RECOVERY.md](BACKUP_RECOVERY.md) |
| All credentials, access details and API keys | ✅ This document |

---

**Client acceptance**

Name: ................................................  (Eyob Dege, CEO)

Signature: ................................................

Date: ................................................
