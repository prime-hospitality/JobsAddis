# Handover Checklist

Per Agreement Section 6 (Hosting and Infrastructure Ownership) and Section 17.F (Final
Handover Requirements) — nothing here should be withheld, and everything should end up
owned/controlled by the Client, not the Developer.

## Code & repository

- [ ] Confirm the GitHub repository (`prime-hospitality/JobsAddis`) is owned by a
      Client-controlled GitHub organization/account, with the Developer only holding
      **contributor** access (per Section 4).
- [ ] Confirm all commits up to the final delivery are pushed to `main`.
- [ ] Hand over this `docs/` folder plus the root `README.md`.

## Supabase project

- [ ] Transfer Supabase **project ownership** to a Client-controlled Supabase
      organization/account (Supabase supports project transfer between orgs from the
      dashboard — Project Settings → General → Transfer project).
- [ ] Share/rotate the **Project URL**, **anon key**, and **service role key**
      (`SUPABASE_SERVICE_ROLE_KEY` — treat as a secret, rotate after transfer if the
      Developer retained a copy anywhere).
- [ ] Confirm who holds the **database password** and rotate it after handover.
- [ ] Confirm the **`SUPABASE_ACCESS_TOKEN`** used by the GitHub Actions deploy
      workflow (`.github/workflows/deploy-functions.yml`) belongs to a Client-owned
      Supabase account, and is stored only as a GitHub Actions secret.
- [ ] Note current **backup/PITR plan settings** (see
      [BACKUP_RECOVERY.md](BACKUP_RECOVERY.md)) so the Client knows what's covered.

## Telegram

- [ ] Transfer **BotFather ownership** of the Telegram bot to a Client-controlled
      Telegram account (BotFather → `/mybots` → select bot → Transfer ownership, or
      regenerate the bot token under Client control if transfer isn't available).
- [ ] Hand over the **`TELEGRAM_BOT_TOKEN`** — rotate it once ownership is confirmed
      with the Client so the Developer no longer holds a valid copy.
- [ ] Confirm ownership/admin rights of any connected **Telegram group/channel** used
      for automatic job-posting announcements.

## Hosting (Next.js app)

- [ ] Confirm which hosting platform serves the Next.js app (no `vercel.json` or other
      platform config is committed — this was not part of the original repository, so
      confirm and document the actual deployment target here once decided/known)
      and that the hosting account is Client-owned.
- [ ] Confirm all environment variables (see [README.md](../README.md) for the full
      list) are set directly in the hosting platform under Client control, not only in
      a Developer's local `.env.local`.

## Credentials & access review

- [ ] **Admin dashboard login** — change the super-admin username/password immediately
      after handover (defaults fall back to `admin` / `admin123` if never configured in
      `app_config` — confirm a real password has been set before go-live).
- [ ] Review the sub-admin list (`Admin Settings` in the dashboard) and remove any
      accounts created for development/testing purposes.
- [ ] Confirm no Developer-held copies of `.env` files, service role keys, or bot
      tokens remain outside of what's been explicitly agreed for the 1-year Tech
      Partnership support period (Section 8).

## Final acceptance (Section 17.F)

The project isn't considered complete until the Client has formally accepted all of:

- [ ] Complete source code + Git repository access under Client ownership
- [ ] Database scripts/migrations (`supabase/migrations/`)
- [ ] Hosting deployment files and Telegram Bot configuration
- [ ] Technical documentation ([ARCHITECTURE.md](ARCHITECTURE.md)) and admin training
      ([ADMIN_GUIDE.md](ADMIN_GUIDE.md))
- [ ] User guide ([USER_GUIDE.md](USER_GUIDE.md)) and backup/recovery procedures
      ([BACKUP_RECOVERY.md](BACKUP_RECOVERY.md))
- [ ] All credentials, access details, and API keys (this checklist)
