# AddisJobs: Prime Hospitality

AddisJobs is a premium, mobile-first Telegram Mini App (TMA) designed to connect hospitality talent in Ethiopia with vetted restaurants, hotels, and venues in Addis Ababa. 

Built using Next.js and Supabase, the application delivers a native mobile experience within Telegram, featuring reactive light/dark styling, gesture-based interactions, and real-time database synchronization.

The application lives in `prime-hospitality/`. Repo-root scripts and Git hooks
are in `scripts/` and `.githooks/`.

## Setting up a machine

Once per computer, from the repository root:

```bash
npm run setup
```

That installs dependencies, arms the Git hooks, sets the commit identity,
records what is installed, and lists anything it cannot do for you — normally
just the values that belong in `prime-hospitality/.env.local`. Run it again any
time; it changes nothing that is already correct.

To ask what state the machine is in without changing anything:

```bash
npm run doctor
```

Then `npm run dev` from the root, or `npm run dev` inside
`prime-hospitality/` — either works.

## Working across two machines

This project moves between a Mac and a Windows PC, and everything that used to
break on arrival was state Git does not carry: installed packages, `.env.local`,
the Supabase CLI link, the commit identity, the hooks path, the Node version.
The code arrived expecting them and nothing said which ones were missing.

So the pull says. `git pull` and `git checkout <branch>` run `npm run doctor`
automatically and print only what needs attention — a new dependency to install,
an environment variable this machine has never had, a credential that arrived in
the commits. A clean pull prints nothing. Neither hook can block anything; they
only tell you what to fix before you start.

Two things stay manual, because nothing can do them for you:

- **`.env.local` never travels.** It is gitignored, and it must be, so a new
  variable has to be copied to the other machine by hand. `npm run doctor`
  names the missing keys and where each value comes from. Until then the app
  fails in ways that do not mention the variable at all.

  `ADMIN_PASSWORD` and `IDP_PASSWORD` are the exception: both real passwords are
  bcrypt hashes in the `app_config` table and `verifyConfigPassword` prefers
  those, so the environment value is reached only if the row is missing. The
  doctor reports them as a warning rather than a failure for that reason.
- **The Supabase CLI login is per-machine.** Only needed to deploy, not to
  develop. `npx supabase login`, then
  `npx supabase link --project-ref rrypxbkipixmuufzkdxp`.

Two things that look like problems and are not:

- **`package-lock.json` shows as modified after `npm install`.** Each machine
  adds the optional platform packages for its own OS, so the two rewrite the
  file back and forth. Unless you actually changed a dependency, discard it:
  `git checkout -- prime-hospitality/package-lock.json`.
- **Node on the Mac is v14 by default.** `/usr/local/bin/node` shadows
  Homebrew's, and Next.js 16 needs ≥ 20.9. `npm run doctor` prints the exact
  `export PATH=...` line when it sees this.

## The Git hooks

Installed by `npm run setup`, which sets `core.hooksPath` — per-machine config
that a clone does not bring with it. For most of this project's life only one of
the two machines had them, which is how a Supabase `service_role` key reached
this public repository on 2026-07-18 and stayed readable for eleven days.

| Hook | What it does |
| --- | --- |
| `pre-commit` | Refuses a commit whose added lines contain something shaped like a credential. |
| `pre-push` | Rescans every commit being pushed, so a key committed on a machine without `pre-commit` still cannot leave. |
| `post-merge` | After a pull: reports stale setup, and warns if the incoming commits carry a credential. |
| `post-checkout` | The same setup check after switching branches. |

The patterns are in `.githooks/lib/scan-secrets.sh`, shared by all of them.
Placeholders are excluded by shape, not by filename, so a real key pasted into a
documentation file is still caught. To override a false positive, add
`--no-verify` to the `git commit` or `git push`, and be certain the string is
not real.

## Deploying

Edge Functions deploy themselves on any push to `main` that touches
`prime-hospitality/supabase/functions/**`, via `.github/workflows/`. The app
deploys itself from `main` on Vercel. Migrations are applied by hand:
`npx supabase db push`.

Apply a migration **before** deploying a function that reads the column it adds
— the cron sweep runs every minute and will error until the column exists.
