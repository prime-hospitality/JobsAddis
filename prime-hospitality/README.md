# JobsAddis — Prime Hospitality Recruitment Platform

A Telegram Mini App recruitment platform connecting job seekers and employers, built for
Prime Hospitality Business Group PLC (JobsAddis).

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — system architecture and data model
- [docs/API.md](docs/API.md) — Edge Function API reference (actions, payloads, status codes)
- [docs/ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md) — admin dashboard walkthrough
- [docs/USER_GUIDE.md](docs/USER_GUIDE.md) — job seeker and employer flows
- [docs/BACKUP_RECOVERY.md](docs/BACKUP_RECOVERY.md) — backup and recovery procedures
- [docs/HANDOVER_CHECKLIST.md](docs/HANDOVER_CHECKLIST.md) — credentials and access handover checklist

## Tech stack

- **Frontend**: Next.js 16 (App Router, React 19), Tailwind CSS
- **Telegram integration**: `@telegram-apps/sdk` / `@tma.js/sdk` (Telegram Mini App SDK) for the job-seeker experience
- **Backend**: Supabase (Postgres + Row Level Security, Storage, Auth via service-role key)
- **Serverless functions**: 4 Supabase Edge Functions (Deno runtime) — see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **Scheduling**: Supabase `pg_cron` + `pg_net` — an every-minute sweep that publishes
  scheduled posts, expires jobs/subscriptions, and dispatches Telegram DMs

## Local development

```bash
cd prime-hospitality
npm install
npm run dev
```

Requires **Node.js >= 20.9.0** (Next.js 16 will not build on older versions).

### Enable the secret-scanning hook (do this once per clone)

```bash
git config core.hooksPath .githooks   # from the repository root
```

Git does not version `.git/hooks`, so this line is what activates
[`.githooks/pre-commit`](../.githooks/pre-commit). It refuses any commit whose
added lines contain a Supabase key, a Telegram bot token, a database URL with a
password, or a secret-shaped variable assigned a long literal. Placeholders of
the `your_..._here` and `<password>` kind are recognised and allowed, so
`.env.example` and the docs still commit normally.

This is not optional hygiene. The repository is public, and the Supabase
`service_role` key — which bypasses row level security entirely — was committed
in four scratch scripts on 2026-07-18 and stayed publicly readable for eleven
days. The hook exists so the next one is caught before it leaves the machine.

If a commit is blocked and the string genuinely is not a secret, `git commit
--no-verify` overrides it.

### Environment variables

Copy `.env.example` (repo root) to `prime-hospitality/.env.local` and fill in real values:

Each variable is set in exactly one place. Nothing below belongs in both.

| Variable | Set in | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel | Supabase project URL — safe to expose |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel | Supabase anon/public key — safe to expose |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel **and** Supabase | **Secret** — bypasses Row Level Security, never expose to the browser. The only variable genuinely needed in both places: Next.js server actions and Edge Functions both use it |
| `ADMIN_PASSWORD` | Vercel | **Secret** — fallback super-admin password, used only until one is set in `app_config` (one is). Falls back to `admin123` if neither exists |
| `IDP_PASSWORD` | Vercel | **Secret** — password for the internal `/idp` developer tracker page |
| `TELEGRAM_BOT_TOKEN` | Supabase | **Secret** — validates Mini App `initData` and sends bot messages. `initData` validation is HMAC-keyed to this token, so it must match the bot serving the Mini App or every job-seeker login fails |
| `TELEGRAM_MINI_APP_URL` | Supabase | Mini App deep link (`https://t.me/<bot>/<app>`) used for "Open app" / "View & Apply" buttons. If unset, messages send without a button and log an error — there is deliberately no fallback URL |
| `TELEGRAM_GROUP_CHAT_ID` | Supabase | Group/channel that new vacancies are announced to. The bot must be an admin there or posts silently fail |

**Vercel** = Project Settings → Environment Variables. **Supabase** = Edge Functions →
Secrets. The `TELEGRAM_*` variables are read only by Deno edge functions and do nothing
in Vercel; the `NEXT_PUBLIC_*` and password variables are read only by Next.js and do
nothing in Supabase.

A third set — `SUPABASE_DB_URL`, `BACKUP_REPO_TOKEN` and friends — lives in **GitHub
Actions secrets** and is used only by the nightly backup workflow. See
[docs/BACKUP_RECOVERY.md](docs/BACKUP_RECOVERY.md).

## Database migrations

Migrations live in `supabase/migrations/` and are applied in filename (timestamp) order.

```bash
npx supabase link --project-ref <project-ref>
npx supabase db push
```

## Deploying edge functions

All 4 functions deploy automatically on push to `main` via
[`.github/workflows/deploy-functions.yml`](../.github/workflows/deploy-functions.yml)
(requires the `SUPABASE_ACCESS_TOKEN` GitHub secret). The workflow lives at the
**repository root**, not inside `prime-hospitality/` — GitHub Actions only reads
workflows from the root, and a workflow placed anywhere else silently never runs.
It can also be triggered by hand from the Actions tab (`workflow_dispatch`), which
is what you want after rotating a secret, since secrets changing doesn't produce a
push to redeploy against.

To deploy manually:

```bash
npx supabase functions deploy <function-name> --project-ref <project-ref> --use-api
```

`_shared/` is not a function — it holds code imported by the others and is bundled
into each of them automatically, so it is never deployed on its own.

## Deploying the Next.js app

Deployed on **Vercel**, under the Client's account. The project is standard Next.js 16
with no platform-specific configuration committed (no `vercel.json` needed — Vercel is
zero-config for Next.js); any Node >=20.9 host would also work.

Set the environment variables above in the Vercel dashboard before the first deploy —
note that the `TELEGRAM_*` variables and `SUPABASE_SERVICE_ROLE_KEY` are consumed by
Edge Functions and belong in **Supabase → Edge Functions → Secrets** instead.
