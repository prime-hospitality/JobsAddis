# JobsAddis — Prime Hospitality Recruitment Platform

A Telegram Mini App recruitment platform connecting job seekers and employers, built for
Prime Hospitality Business Group PLC (JobsAddis).

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — system architecture and data model
- [docs/ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md) — admin dashboard walkthrough
- [docs/USER_GUIDE.md](docs/USER_GUIDE.md) — job seeker and employer flows
- [docs/BACKUP_RECOVERY.md](docs/BACKUP_RECOVERY.md) — backup and recovery procedures
- [docs/HANDOVER_CHECKLIST.md](docs/HANDOVER_CHECKLIST.md) — credentials and access handover checklist

## Tech stack

- **Frontend**: Next.js 16 (App Router, React 19), Tailwind CSS
- **Telegram integration**: `@telegram-apps/sdk` / `@tma.js/sdk` (Telegram Mini App SDK) for the job-seeker experience
- **Backend**: Supabase (Postgres + Row Level Security, Storage, Auth via service-role key)
- **Serverless functions**: 5 Supabase Edge Functions (Deno runtime) — see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **Scheduling**: Supabase `pg_cron` + `pg_net` (daily job-expiration sweep)

## Local development

```bash
cd prime-hospitality
npm install
npm run dev
```

Requires **Node.js >= 20.9.0** (Next.js 16 will not build on older versions).

### Environment variables

Copy `.env.example` (repo root) to `prime-hospitality/.env.local` and fill in real values:

| Variable | Used by | Notes |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Frontend | Public base URL of the deployed app |
| `NEXT_PUBLIC_SUPABASE_URL` | Frontend | Supabase project URL — safe to expose |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Frontend | Supabase anon/public key — safe to expose |
| `SUPABASE_SERVICE_ROLE_KEY` | Server actions, Edge Functions | **Secret** — bypasses Row Level Security, never expose to the browser |
| `TELEGRAM_BOT_TOKEN` | Edge Functions | **Secret** — used to validate Telegram Mini App `initData` and send bot messages |

## Database migrations

Migrations live in `supabase/migrations/` and are applied in filename (timestamp) order.

```bash
npx supabase link --project-ref <project-ref>
npx supabase db push
```

## Deploying edge functions

All 5 functions deploy automatically on push to `main` via
`.github/workflows/deploy-functions.yml` (requires the `SUPABASE_ACCESS_TOKEN` GitHub secret).
To deploy manually:

```bash
npx supabase functions deploy <function-name> --project-ref <project-ref> --use-api
```

## Deploying the Next.js app

The app is a standard Next.js 16 project with no platform-specific configuration
committed (no `vercel.json`) — deploy to Vercel (recommended, zero-config for Next.js) or
any Node >=20.9 host. Set the environment variables above in the hosting platform's
dashboard before the first deploy.
