# AddisJobs — Prime Hospitality

A mobile-first Telegram Mini App that connects hospitality talent in Ethiopia
with vetted restaurants, hotels, and venues in Addis Ababa. Job seekers browse
and apply for jobs without leaving Telegram; employers post openings, manage
applicants, and run their subscriptions from an admin dashboard.

## Stack

- **Next.js 16** (App Router) with **React 19** and **TypeScript**
- **Tailwind CSS v4** for styling, **Framer Motion** for animation
- **Supabase** — Postgres with Row Level Security, Storage, and Edge Functions
  (Deno), plus `pg_cron` for scheduled publishing and expiry
- **Telegram Mini App SDK** (`@telegram-apps/sdk`, `@tma.js/sdk`) for the
  in-Telegram experience
- Deployed on **Vercel**

The application source lives in `prime-hospitality/`.
