# Deploying Concertium to Hostinger (Node.js hosting)

This guide covers deploying Concertium to Hostinger shared/cloud hosting, which
runs Node.js apps behind Passenger. It also explains the most common failure —
a missing `DATABASE_URL` — and how to avoid it.

> TL;DR: the app needs **environment variables** and a **database** that exist on
> the server. Your `.env` is git-ignored, so it does **not** get deployed — you
> must configure env vars and create the database on the server itself.

---

## 1. Environment variables (required)

The app will crash-loop on every request until these exist in the server
environment. Set them in **hPanel → Websites → _yourdomain_ → Advanced →
Node.js → Environment variables**, or create a `.env` file in the app root.

| Variable        | Required | Example / notes |
| --------------- | -------- | --------------- |
| `DATABASE_URL`  | ✅       | SQLite: `file:/home/USER/domains/DOMAIN/nodejs/prisma/prod.db` (use an **absolute** path). MySQL: `mysql://user:pass@host:3306/dbname` |
| `AUTH_SECRET`   | ✅       | A long random string. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `NODE_ENV`      | ⚠️       | `production` (Hostinger usually sets this) |
| `SLACK_WEBHOOK_URL` | optional | Enables Slack alert digests |
| `NOTIFY_EMAIL`, `SMTP_*` | optional | Email alerts / weekly reports |
| `CRON_SECRET`   | optional | Guards `/api/cron` for an external scheduler |
| `ENABLE_SCHEDULER`, `SCHEDULER_HOUR` | optional | In-process daily scheduler |

If the app's start directory is unclear, always use an **absolute** SQLite path
so Prisma resolves it consistently.

---

## 2. Choose a database

### Option A — MySQL (recommended for production)
Shared hosting runs multiple worker processes; a server database handles
concurrent access properly and survives redeploys.

1. Create a MySQL database + user in hPanel (**Databases → MySQL**).
2. In `prisma/schema.prisma`, set the provider to MySQL:
   ```prisma
   datasource db {
     provider = "mysql"
     url      = env("DATABASE_URL")
   }
   ```
3. Set `DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/DBNAME"` in the env.
4. Apply the schema: `npx prisma db push` (then `npm run db:seed`).

### Option B — SQLite (quick start / low traffic only)
Works, but writes are serialized and the file can be lost on redeploy. Keep the
`prod.db` path **outside** anything a deploy overwrites, and use an absolute
`DATABASE_URL` as shown above. The default schema already uses `sqlite`.

---

## 3. First deploy (over SSH, in the app directory)

```bash
cd ~/domains/DOMAIN/nodejs

# 1) install deps (runs `prisma generate` via postinstall)
npm install

# 2) create/upgrade the database schema, then seed the first admin + sample data
npx prisma db push
npm run db:seed

# 3) production build
npm run build
```

Set the Node app's **startup file/command** to `npm start` (which runs
`next start`) in hPanel, then **start/restart** the app. For Passenger you can
also force a restart with:

```bash
mkdir -p tmp && touch tmp/restart.txt
```

Sign in with the seeded admin (`admin@concertium.local` / `changeme123`) and
change the password immediately (Team page).

---

## 4. Updating an existing deployment

```bash
cd ~/domains/DOMAIN/nodejs
git pull
npm install
npx prisma db push     # apply any new schema columns/tables (additive)
npm run build
touch tmp/restart.txt  # or restart from hPanel
```

> Note: `npm start` does **not** auto-sync the schema (only `npm run dev` does,
> via the `predev` step). On the server, always run `npx prisma db push` after
> pulling schema changes, or you'll see `PrismaClientKnownRequestError` /
> "column does not exist".

---

## 5. Troubleshooting

**`Environment variable not found: DATABASE_URL`** + the app repeatedly printing
`✓ Ready in 0ms`
→ `DATABASE_URL` isn't set in the server environment (most often because `.env`
wasn't deployed — it's git-ignored). Set it per section 1 and restart.

**`AUTH_SECRET is not set (or too short)`**
→ Add `AUTH_SECRET` (≥ 16 chars) to the env and restart.

**`The column main.X.Y does not exist`** (`P2022`)
→ The database schema is behind the code. Run `npx prisma db push` on the server.

**`Unable to open the database file` (SQLite)**
→ The `DATABASE_URL` path isn't writable or the directory doesn't exist. Use an
absolute path under your domain's `nodejs/` folder and ensure it exists.

**App won't start / port issues**
→ Hostinger assigns the port; let the app use `process.env.PORT` (Next's
`next start` respects `PORT`). Don't hard-code a port in the start command.

---

## 6. Automated deploys (GitHub Actions)

`.github/workflows/deploy.yml` deploys to Hostinger over SSH on every push to
`main` (and on manual "Run workflow"). It pulls, installs, runs
`prisma db push`, builds, and restarts the app — so shipping a change is just a
push. Secrets live in GitHub and are never shared with anyone.

**One-time setup**

1. **Add an SSH key to Hostinger:** hPanel → Advanced → **SSH Access** → add the
   *public* key. Keep the matching *private* key for the next step.
2. **Add GitHub secrets:** repo → Settings → Secrets and variables → **Actions**:
   | Secret | Value |
   | ------ | ----- |
   | `HOSTINGER_HOST` | server IP or hostname |
   | `HOSTINGER_PORT` | SSH port (shared hosting is usually `65002`) |
   | `HOSTINGER_USER` | e.g. `u294070911` |
   | `HOSTINGER_SSH_KEY` | the **private** key (full text) |
   | `HOSTINGER_APP_DIR` | e.g. `/home/u294070911/domains/lindenlaub.cloud/nodejs` |
   | `HOSTINGER_PRE` | *(optional)* command to activate Node before npm, e.g. `source /home/USER/nodevenv/domains/DOMAIN/nodejs/22/bin/activate` |
3. **Make sure the server can `git pull`** this repo (it already can if you
   cloned it there). The first env setup + database creation (sections 1–3)
   still happens once on the server.

After that, every push to `main` redeploys automatically. You can also run the
same steps by hand with `bash scripts/deploy.sh` over SSH.

> Note: native modules are kept optional (`@resvg/resvg-js`, used only to render
> the site-map PNG), so `npm install` won't fail on hosts without a prebuilt
> binary — the SVG site map is still generated.
