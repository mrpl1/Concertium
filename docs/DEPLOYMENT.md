# Deploying to Hostinger

This app runs on Hostinger as a **Web App** (not classic PHP shared hosting, and
not the older cPanel/Passenger Node setup). Knowing which of those you have
matters, because the deploy procedure is completely different for each.

**Current setup — verified 2026-09-09:**

| | |
| --- | --- |
| Domain | `lindenlaub.cloud` |
| Plan | Single |
| Type | Hostinger **Web App** |
| Node | 22.x |
| Framework | "Other" |
| Build & output | "Custom" |
| Root directory | `Concertium-main` |
| Deploy source | **Manually uploaded zip** (`Concertium-main.zip`) |
| SSH / terminal | **Not available on this plan** |

> If you are reading an older version of this file that talks about
> `~/nodevenv/...`, `source .../bin/activate`, `tmp/restart.txt`, or
> hPanel → Advanced → Terminal — none of that applies. Those describe the
> cPanel/Passenger layout, which this account does not use.

---

## 1. How a deploy works here

There is no `git pull` on the server. Hostinger serves whatever was in the last
uploaded zip. A deploy is:

1. Produce a zip whose **single top-level folder is `Concertium-main/`**, with
   the project files inside it. GitHub's "Code → Download ZIP" of the `main`
   branch produces exactly this shape and filename.
2. hPanel → **Websites → lindenlaub.cloud → Deployments** → upload the zip.
3. Hostinger unpacks it, runs the configured build, and restarts the app.

The **Redeploy** button on the Dashboard re-runs the build for the zip that is
already there. It does *not* fetch new code — use it after changing an
environment variable, not to ship a code change.

Do not change the root directory or the zip's top-level folder name; they must
stay in agreement or the app will not be found.

---

## 2. Environment variables

Set these in hPanel → **Websites → lindenlaub.cloud → Environment variables**.
`.env` is git-ignored and is *not* in the zip, so the panel is the only place
these can come from.

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | `mysql://USER:PASSWORD@HOST:3306/DBNAME`. URL-encode any `@ : / #` in the password. |
| `AUTH_SECRET` | yes | ≥ 32 random chars. `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `NODE_ENV` | usually set by the platform | `production` |
| `SLACK_WEBHOOK_URL` | optional | Slack alert digests |
| `SMTP_*`, `NOTIFY_EMAIL` | optional | Email alerts / weekly reports |
| `CRON_SECRET` | optional | Guards `/api/cron` |
| `ENABLE_SCHEDULER`, `SCHEDULER_HOUR` | optional | In-process scheduler |

After changing a variable, hit **Redeploy** — a running app does not pick up
new env values on its own.

> **Unverified:** whether these variables are also exposed to the *build* step,
> as opposed to only the runtime. This matters for schema migrations — see §4.
> Confirm before relying on it.

---

## 3. Database

MySQL, created under hPanel → **Databases**. From the app the host is normally
`localhost`.

With no SSH there is no way to run `npx prisma db push` or `npm run db:seed` by
hand. Your options for schema work are:

- **phpMyAdmin** (hPanel → Databases) — run SQL directly. `prisma/init.sql`
  holds the full schema for a from-scratch creation.
- **Fold it into the build command** — see §4.
- **Remote MySQL** — hPanel → Databases → Remote MySQL, allowlist your IP, then
  connect from your machine and run Prisma locally against production. Re-disable
  it when you are done.

---

## 4. Schema changes

`npm start` does **not** sync the schema. If a deploy contains new columns or
tables and the database has not been migrated, the app fails at runtime with
`P2022` / "column does not exist".

For an **additive** change, the build command can carry the migration:

```
prisma generate && prisma db push && next build
```

(this is the `prod:deploy` script in `package.json`). Two caveats:

- It requires `DATABASE_URL` at *build* time — see the note in §2.
- It runs a schema push against production on **every** deploy. That is fine for
  additive changes and dangerous for anything that drops or retypes a column.

For a **destructive or backfill-requiring** change — anything adding a `NOT NULL`
column to a table that already has rows — do not rely on `db push` alone. Take a
backup first (hPanel → Backups), apply the SQL through phpMyAdmin, and run any
backfill script before the new code goes live.

> **This applies to the workspace change already on `main`.** `workspaceId` is
> `NOT NULL` on `Client`, `Project` and `Tag`, so a database with existing rows
> needs `prisma/backfill-workspace.ts` (`npm run db:backfill`) run against it
> before the current code will work. With no shell on this plan that means
> running it locally over Remote MySQL, or applying the equivalent SQL through
> phpMyAdmin.

---

## 5. Automated deploys

There are none, and the previous `.github/workflows/deploy.yml` has been removed
because it could never have worked: it deployed over SSH to
`/home/u294070911/domains/lindenlaub.cloud/nodejs` using `nodevenv` and a
Passenger `tmp/restart.txt` restart. No part of that exists on this plan, so
every run failed.

If you want push-to-deploy back, the options are:

- Move the site to a Hostinger plan that includes SSH, then restore an
  SSH-based workflow.
- Add a workflow that only *builds the zip* and attaches it as an artifact, so
  the upload stays a deliberate manual step.
- Check whether Hostinger's Web App deploy has since gained a Git source, and
  point it at this repo.

---

## 6. Troubleshooting

Runtime logs: hPanel → **Websites → lindenlaub.cloud → Runtime logs**.

| Symptom | Cause |
| --- | --- |
| `Environment variable not found: DATABASE_URL` | Not set in the panel, or set but not redeployed. |
| `AUTH_SECRET is not set (or too short)` | Add it (≥ 16 chars) and redeploy. |
| `P2022` / "column does not exist" | Database schema is behind the deployed code — see §4. |
| `Access denied` / `Can't reach database server` | `DATABASE_URL` credentials or host wrong, or the DB user is not assigned to the database. |
| 503 / restart loop | The app must bind `process.env.PORT`. `server.js` does this; make sure the start command is `npm start`. |

---

## 7. Local development

```bash
docker compose up -d          # MySQL on :3306
cp .env.example .env          # fill in DATABASE_URL + AUTH_SECRET
npm install
npm run setup                 # generate + db push + seed
npm run dev
```

Seeded admin: `admin@concertium.local` / `changeme123` — change it immediately
on the Team page.
