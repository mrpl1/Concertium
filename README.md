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

## Tech stack

- [Next.js](https://nextjs.org/) (App Router, TypeScript) — server components +
  server actions
- [Prisma](https://www.prisma.io/) ORM with **SQLite** (swap to Postgres easily)
- [Tailwind CSS](https://tailwindcss.com/)
- Auth via bcrypt-hashed passwords + a signed JWT session cookie (`jose`)
- [Nodemailer](https://nodemailer.com/) for optional automatic email sending

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
#   then edit .env — at minimum set a long random AUTH_SECRET:
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 3. Set up the database (creates tables + a starter admin & sample data)
npm run setup

# 4. Run it
npm run dev
```

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

## Moving to a shared/hosted database

SQLite is great for a single host. To use Postgres (e.g. for a hosted
deployment shared across the team):

1. In `prisma/schema.prisma`, change `provider = "sqlite"` to
   `provider = "postgresql"`.
2. Set `DATABASE_URL` to your Postgres connection string.
3. Run `npm run db:push` (and `npm run db:seed` for the initial admin).

## Useful scripts

| Script              | Description                                  |
| ------------------- | -------------------------------------------- |
| `npm run dev`       | Start the dev server                         |
| `npm run build`     | Production build                             |
| `npm start`         | Run the production build                     |
| `npm run setup`     | Generate client, push schema, seed data      |
| `npm run db:push`   | Apply the Prisma schema to the database      |
| `npm run db:seed`   | Seed the admin user + sample data            |
| `npm run db:studio` | Open Prisma Studio to browse the database    |
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
