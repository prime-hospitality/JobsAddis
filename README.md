# AddisJobs: Prime Hospitality

AddisJobs is a premium, mobile-first Telegram Mini App (TMA) designed to connect hospitality talent in Ethiopia with vetted restaurants, hotels, and venues in Addis Ababa. 

Built using Next.js and Supabase, the application delivers a native mobile experience within Telegram, featuring reactive light/dark styling, gesture-based interactions, and real-time database synchronization.

---

## System Architecture

The project consists of two primary layers:
1. **Frontend (Next.js):** Runs as a client-side app within the Telegram WebApp context. It utilizes `@telegram-apps/sdk` for haptics, theme synchronization, and navigation.
2. **Backend (Supabase):** Serves as the database and API layer. PostgreSQL schemas and Row-Level Security (RLS) policies govern data access, while Edge Functions validate Telegram user session payloads and handle notifications.

---

## Repository Structure

- `prime-hospitality/src`: React components, views, hooks, and application state.
  - `/app`: Next.js App Router initialization, layout, and global styling.
  - `/components`: Reusable UI elements (navigation, modals, drawers).
  - `/screens`: Flow-specific views (seeker onboarding, job detail, dashboard, applicant tracking).
  - `/hooks`: Custom integrations (useTelegram, useCvUpload, useJobs).
- `prime-hospitality/supabase`: Database schema migrations and Edge Functions.
  - `/migrations`: Version-controlled SQL files defining tables, indices, and RLS policies.
  - `/functions`: Serverless TypeScript Edge Functions (authentication, shortlist actions, webhooks, and Telegram notifications).

---

## Core Application Flows

### Seeker Registration & Job Search
- **Onboarding:** A registration flow that captures categories, contact details, experience level, portfolio, and resume uploads.
- **Search & Filtering:** Fast virtualized listing supporting instant filter chips, text search, and category pagination.
- **Applications:** Candidate application submission, tracking, and CV storage inside Supabase Storage.

### Employer Dashboard
- **Job Posting:** Dedicated dashboard view for vetted business representatives to create listings via animated slide-up drawers.
- **Applicant Tracking:** View, shortlist, or decline candidates with instant status tracking.
- **Channel Announcements:** Optional automated job announcement dispatch to target Telegram groups/channels.

---

## Database Schema & Row-Level Security (RLS)

All database operations are governed by strict RLS rules under the Postgres schema to isolate candidate data and ensure privacy:
- `profiles`: Holds candidate credentials, portfolio details, and CV storage URLs.
- `employers`: Contains vetted hospitality business details and active manager IDs.
- `jobs`: Stores active, closed, and pending job postings.
- `applications`: Tracks submission history and review status. Only the candidate and the hiring employer have access to an application.
- `notifications`: Manages in-app seeker updates for application state transitions.

---

## Environment Configuration

To deploy the application to a new hosting provider (e.g., Vercel) and database instance (Supabase), ensure the following environment keys are defined:

### Web Client Variables
- `NEXT_PUBLIC_SUPABASE_URL`: Endpoint of the target Supabase project.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Public key for client-side API requests.
- `NEXT_PUBLIC_APP_URL`: Domain host of the deployed Next.js application.

### Backend/Secrets Variables
- `TELEGRAM_BOT_TOKEN`: Token obtained from `@BotFather` to authorize client authentication payloads and trigger system alerts.
- `TELEGRAM_GROUP_CHAT_ID`: The ID of the Telegram channel or group to broadcast new job postings.
- `TELEGRAM_MINI_APP_URL`: The official launch link of the Telegram Mini App button.
