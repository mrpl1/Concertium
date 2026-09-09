# Concertium

A lightweight project management web app for teams. Track clients, monitor
project status, and generate & send email status reports.

## Features

- **Clients** — keep a directory of clients with contact details and notes.
- **Projects** — track per-client projects with status, priority, progress,
  owner, and start/due dates.
- **Deliverables/milestones** — break each project into concrete deliverables
  with their own owner, due date, and acceptance state (Pending → In Progress →
  In Review → Approved / Blocked).
- **Deadline integrity** — a baseline due date is captured the first time a date
  is set; every change is logged so you can see slippage ("+12d, slipped 2×").
- **Automatic health/risk** — projects are objectively flagged overdue / at-risk
  (overdue items, blocked work, due-soon-but-behind, stale, off track) without
  overwriting the manual status.
- **Status updates** — post timestamped updates to a project and optionally
  change its status in one step.
- **Interactive dashboard** — client selector, project-lifecycle graph,
  risk-driven "needs attention", overdue count, and recent activity.
- **Timeline** — upcoming project & deliverable deadlines, bucketed by urgency.
- **Analytics** — on-time delivery rate, average slippage, status distribution,
  and per-client health.
- **Resources, time & budget** — attach links (SOW, contracts, designs) to a
  project, log time against it, and track burn versus a budgeted hours target.
- **Tags & search** — tag projects and filter by tag; global search across
  clients and projects from the nav bar.
- **Status reports** — generate a formatted report for a single client or all
  clients, then draft it in your mail client or send via SMTP.
- **Automations** — daily alert digest (email + Slack) and scheduled weekly
  client reports (see below).
- **Client status link** — a tokenized, read-only public page per client
  (`/share/<token>`) you can share without giving them a login.
- **Team & auth** — email + password login. The first account becomes the
  admin, who can add teammates and manage automations.
- **Dark mode** — a toggle in the nav (and on the sign-in screen) that persists
  your choice and defaults to your OS preference, with no flash on load.

## Tech stack

- [Next.js](https://nextjs.org/) (App Router, TypeScript) — server components +
  server actions
- [Prisma](https://www.prisma.io/) ORM with **MySQL** (local via Docker; any MySQL host in prod)
- [Tailwind CSS](https://tailwindcss.com/)
- Auth via bcrypt-hashed passwords + a signed JWT session cookie (`jose`)
- [Nodemailer](https://nodemailer.com/) for optional automatic email sending

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Start a local MySQL (uses docker-compose.yml)
docker compose up -d

# 3. Configure environment
cp .env.example .env
#   .env already points DATABASE_URL at the local MySQL above; also set a
#   long random AUTH_SECRET:
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 4. Set up the database (creates tables + a starter admin & sample data)
npm run setup

# 5. Run it
npm run dev
```

> Prefer not to use Docker? Install MySQL locally (e.g. `brew install mysql`),
> create a `concertium` database, and point `DATABASE_URL` at it.

Open http://localhost:3000. The first time, you'll be prompted to create the
first account (which becomes the admin), or you can sign in with the seeded
admin printed by `npm run setup`.

## Email status reports

Reports work in two modes:

1. **Draft in your mail client** (no setup) — Concertium builds the report and
   opens a pre-filled email in your default mail app, or lets you copy it.
2. **Automatic send** (optional) — fill in the `SMTP_*` variables in `.env` and
   Concertium will send the report itself. For Gmail, use an
   [App Password](https://support.google.com/accounts/answer/185833):

   ```env
   SMTP_HOST="smtp.gmail.com"
   SMTP_PORT="465"
   SMTP_SECURE="true"
   SMTP_USER="you@gmail.com"
   SMTP_PASS="your-app-password"
   SMTP_FROM="Concertium Reports <you@gmail.com>"
   ```

## Automations (alerts & scheduled reports)

Concertium can proactively flag deadline risk and send reports on a schedule
(Admin → **Automations**):

- **Daily alert digest** — a summary of overdue, at-risk, and due-within-7-days
  projects, emailed (to `NOTIFY_EMAIL`, or all admins) and/or posted to Slack.
- **Weekly client reports** — automatically email a status report to each client
  you've opted in (Clients → Edit → *Send weekly status report*).

These run via a secured endpoint you trigger from any scheduler:

```bash
# once a day
curl -s "https://your-host/api/cron?secret=$CRON_SECRET"
```

It sends the alert digest every day and the weekly reports on
`WEEKLY_REPORT_DAY` (0=Sun … 6=Sat, default Friday). On macOS/Linux you can use
`cron`; on a hosted platform use its scheduler (e.g. Vercel Cron). You can also
run both manually from the Automations page at any time.

Relevant `.env` settings: `CRON_SECRET`, `NOTIFY_EMAIL`, `SLACK_WEBHOOK_URL`,
`WEEKLY_REPORT_DAY` (Slack uses an [Incoming Webhook](https://api.slack.com/messaging/webhooks)).

### Slack alerts + scheduling on an always-on host (e.g. a Mac mini)

1. **Create a Slack Incoming Webhook**: https://api.slack.com/messaging/webhooks
   → *Create app* → enable *Incoming Webhooks* → *Add New Webhook to Workspace*
   → pick a channel → copy the `https://hooks.slack.com/services/…` URL.
2. **Add it to `.env`** on the host and verify:
   ```env
   SLACK_WEBHOOK_URL="https://hooks.slack.com/services/XXX/YYY/ZZZ"
   ```
   ```bash
   npm run notify:test     # posts a test message to the channel
   ```
3. **Pick ONE scheduling mechanism** (running both double-sends):
   - **In-process (simplest for an always-on machine):** in `.env` set
     ```env
     ENABLE_SCHEDULER="true"
     SCHEDULER_HOUR="8"      # 24h local time for the daily digest
     ```
     then restart the server (`npm start`). The running app sends the digest
     itself — no cron needed.
   - **External (launchd), if the server isn't always up:** set `CRON_SECRET`
     in `.env`, keep `ENABLE_SCHEDULER="false"`, then install the provided job:
     ```bash
     # edit ops/com.concertium.cron.plist and replace __CRON_SECRET__
     cp ops/com.concertium.cron.plist ~/Library/LaunchAgents/
     launchctl load ~/Library/LaunchAgents/com.concertium.cron.plist
     ```
4. **Test the whole digest path anytime** from **Automations → "Send alert
   digest now"** in the app (admin only).

## Deploying

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**. Production runs on Hostinger
as a **Web App**, deployed by uploading a zip — there is no SSH, no terminal,
and no push-to-deploy on the current plan. That doc covers the zip layout,
the environment variables (which must be set in hPanel, since `.env` is not
deployed), and how to handle schema changes without a shell.

The app uses **MySQL** everywhere. In production, set `DATABASE_URL` in
hPanel → Environment variables and apply schema changes via the build command
or phpMyAdmin — see DEPLOYMENT.md §3–4.

## Useful scripts

| Script              | Description                                  |
| ------------------- | -------------------------------------------- |
| `npm run dev`       | Start the dev server                         |
| `npm run build`     | Production build                             |
| `npm start`         | Run the production build                     |
| `npm run setup`     | Generate client, push schema, seed data      |
| `npm run db:push`   | Apply the Prisma schema to the database      |
| `npm run db:seed`   | Seed the admin user + sample data            |
| `npm run db:reset`  | Drop & recreate the database schema, then seed   |
| `npm run db:studio` | Open Prisma Studio to browse the database    |

> `npm run dev` automatically syncs the database to the current Prisma schema
> first (via a `predev` step), so pulling schema changes won't leave your local
> database out of date. If a change is destructive, it will stop and tell you to
> run `npm run db:reset` (rebuilds the local DB) or
> `npx prisma db push --accept-data-loss`.
| `npm run sitemap`   | Regenerate the visual site map               |
| `npm run sitemap:check` | Fail if the site map is out of date (CI)  |

## Site map (auto-generated)

A visual site map of the whole app lives at
[`docs/sitemap.png`](docs/sitemap.png) (with a scalable
[`docs/sitemap.svg`](docs/sitemap.svg)).

It is **derived from the routes in `src/app`** by
`scripts/generate-sitemap.mjs` and **regenerated automatically on every build**
(via the `prebuild` script), so it stays in sync as pages are added or removed.
Curated card descriptions live in the `META` table inside that script; a new
route without an entry still appears, and the generator warns you to describe
it. Use `npm run sitemap:check` in CI to enforce that the committed map is
current.
