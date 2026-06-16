# Go Live on Hostinger — simple step-by-step

Follow these in order. Each step says exactly where to click or what to paste.
Most of this happens **once**; after that, updates are one command.

Placeholders to know (from your account):
- **USER** = `u294070911`
- **DOMAIN** = `lindenlaub.cloud`
- **APP DIR** = `/home/u294070911/domains/lindenlaub.cloud/nodejs`

---

## Step 1 — Create the MySQL database (in hPanel)

1. hPanel → **Databases → MySQL Databases**.
2. Create a new database (e.g. name `concertium`) and a new user with a password.
   Hostinger will prefix them, so you'll get something like
   `u294070911_concertium` (db) and `u294070911_app` (user).
3. Make sure the user is **added/assigned** to the database (with all privileges).
4. Build your connection string and keep it for Step 2:

   ```
   mysql://DBUSER:DBPASSWORD@localhost:3306/DBNAME
   ```
   Example: `mysql://u294070911_app:MyPassw0rd@localhost:3306/u294070911_concertium`
   (If the password has special characters like `@ : / #`, URL-encode them.)

---

## Step 2 — Set two environment variables (in hPanel)

1. hPanel → **Websites → lindenlaub.cloud → Dashboard → Advanced → Node.js**
   (the Node.js app screen).
2. In the **Environment variables** section, add these two and **Save**:

   | Name | Value |
   | ---- | ----- |
   | `DATABASE_URL` | the `mysql://…` string from Step 1 |
   | `AUTH_SECRET`  | `e39acc6b5e598a480622c57de85621f49a55a9c71e511e5ba1b66d445dd6aba2` |

3. Confirm the app's **startup command** is `npm start` (Node.js app screen).

---

## Step 3 — Open the terminal

Easiest: hPanel → **Advanced → Terminal** (a browser terminal — no setup).
Or from your Mac: `ssh -p 65002 u294070911@<your-server-IP>`.

---

## Step 4 — Activate Node, then deploy (paste these one block at a time)

```bash
cd ~/domains/lindenlaub.cloud/nodejs

# turn on Node for this app (find your version first, then activate it):
ls ~/nodevenv/domains/lindenlaub.cloud/nodejs/
# you'll see a number like "22". Use it in the next line:
source ~/nodevenv/domains/lindenlaub.cloud/nodejs/22/bin/activate
```

Now pull the latest code and deploy:

```bash
git fetch origin
git reset --hard origin/main
npm install
npx prisma generate
npx prisma db push
npm run build
mkdir -p tmp && touch tmp/restart.txt
```

That installs everything, creates the database tables, builds the app, and
restarts it. (After the first time, you can just run `bash scripts/deploy.sh`.)

---

## Step 5 — Open the site and create your admin

1. Visit **https://lindenlaub.cloud**.
2. You'll see **"Create the first account"** — make your login. The first account
   becomes the admin. Done — you're live. 🎉

---

## If something goes wrong

- **`Environment variable not found: DATABASE_URL`** → Step 2 didn't save, or the
  app wasn't restarted. Re-check the variable and restart the app from the Node.js
  screen.
- **`Access denied` / `Can't reach database server`** → the `DATABASE_URL` user,
  password, or db name don't match Step 1, or the user isn't assigned to the db.
- **`npm: command not found`** → you skipped the `source …/activate` line in Step 4.
- **`git pull` asks for a username/password** → the repo is private; create a
  GitHub Personal Access Token (github.com/settings/tokens) and use it as the
  password, or set up an SSH deploy key.
- **Blank page / 500** → in the terminal run `cd ~/domains/lindenlaub.cloud/nodejs && npm start`
  to see the error directly, and send it over.

---

## Later: make updates deploy automatically

Once it's live, you can enable the GitHub Actions workflow (already in the repo)
so every push to `main` redeploys — see `docs/DEPLOYMENT.md` → "Automated deploys".
Until then, to ship an update just repeat the two commands:

```bash
cd ~/domains/lindenlaub.cloud/nodejs && source ~/nodevenv/domains/lindenlaub.cloud/nodejs/22/bin/activate
bash scripts/deploy.sh
```
