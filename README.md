# Concertium

A lightweight project management web app for teams. Track clients, monitor
project status, and generate & send email status reports.

## Features

- **Clients** — keep a directory of clients with contact details and notes.
- **Projects** — track per-client projects with status, priority, progress,
  owner, and start/due dates.
- **Status updates** — post timestamped updates to a project and optionally
  change its status in one step.
- **Dashboard** — at-a-glance view of project health, items needing attention,
  upcoming deadlines, and recent activity.
- **Status reports** — generate a formatted report for a single client or all
  clients, then either open a pre-filled draft in your mail client or send it
  automatically via SMTP/email service.
- **Team & auth** — email + password login. The first account becomes the
  admin, who can add teammates from the Team page.

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
