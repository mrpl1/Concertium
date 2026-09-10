# Cloudflare Workers port

**Status as of 2026-09-10: builds, deploys, and reads/writes D1 at runtime.**
Deployed to the `concertium-dashboard` Worker
(https://concertium-dashboard.philipplin.workers.dev) against the live D1
database `concertium`, schema applied, empty of real data. Production is
still unaffected and stays on Hostinger — nothing here has real client data
yet. That's the one remaining step; see "The unresolved question" below.

This branch (`cloudflare-d1-merge`, merged up to date with `main`) is further
along than the previous revision of this doc suggested. Every blocker listed
below that date has been fixed and verified; read on for what that took and
what's still open.

---

## What this branch actually is

An [OpenNext](https://opennext.js.org/cloudflare) port of the app to Cloudflare
Workers, with the datastore moved from **MySQL to Cloudflare D1** (SQLite).

The move off Prisma 5 was not optional. Prisma 5 ships a ~16 MB native query
engine (`libquery_engine-*.so.node`); Workers cannot load a native binary, so
Prisma 5 can never run there regardless of bundle size. That forces Prisma 7
plus a driver adapter, and the adapter choice picks the database.

| | |
| --- | --- |
| Branch | `cloudflare-d1-merge`, merged onto current `main` |
| Prisma | 7.10 with `@prisma/adapter-d1`, `engineType = "client"` |
| `schema.prisma` provider | `sqlite` (was `mysql`) |
| Migrations | `migrations/0001_init.sql`, via `prisma migrate diff`, applied |
| D1 database | `concertium`, id `094db8e6-7001-4a84-80f6-2f4350bf58c6` — schema applied, 0 real rows |
| Worker name | `concertium-dashboard` (see fix #4 below) |
| Deployed | Yes — https://concertium-dashboard.philipplin.workers.dev |

---

## Fixed since the last revision of this doc

### 1. `worker.ts` was written against a pre-multi-tenancy API — fixed

`sendAlertDigest(workspaceId, opts)` / `runWeeklyReports(workspaceId)` (old,
single-tenant) are now called as `sendAllAlertDigests(opts)` /
`runAllWeeklyReports()` (the workspace-iterating variants
`src/app/api/cron/route.ts` already used).

### 2. `worker.ts` importing app code broke the *deploy*, not the build — fixed

Building and typechecking `worker.ts` with `@/lib/automations` imported
directly succeeded — the failure only showed up at actual `wrangler deploy`
time, as a Cloudflare API validation error:

```
Uncaught Error: This module cannot be imported from a Client Component
module. It should only be used from a Server Component.
  at node_modules/server-only/index.js:1:7   [code: 10021]
```

`server-only` throws unconditionally when bundled by anything other than
Next's own bundler; `worker.ts` is bundled separately by wrangler. Fixed by
calling `/api/cron` over the `WORKER_SELF_REFERENCE` service binding instead
of importing anything from `src/`:

```ts
env.WORKER_SELF_REFERENCE!.fetch(
  `https://self/api/cron?secret=${encodeURIComponent(env.CRON_SECRET ?? "")}`
);
```

`CRON_SECRET` is a secret (`wrangler secret put`), not a `wrangler.jsonc` var,
so it isn't picked up by `wrangler types` — typed by hand in `env.extra.d.ts`,
which (unlike the generated `cloudflare-env.d.ts`) is committed and survives
`npm run cf-typegen`.

**Lesson for next time:** a clean `next build` / `opennextjs-cloudflare build`
does not prove a Worker will actually deploy. Only `wrangler deploy` (not
`--dry-run`) exercises Cloudflare's server-side module validation.

### 3. The cron trigger could never fire — fixed

`triggers.crons` was `[]`; now `["0 8 * * *"]`.

### 4. Worker name mismatch with the connected build — fixed

The repo's "Workers Builds" GitHub check (`Workers Builds:
concertium-dashboard`) was failing in 0 seconds on every commit because it's
tied to a Worker called `concertium-dashboard` (created via the Cloudflare
dashboard, `last_deployed_from: dash_template`), while `wrangler.jsonc` named
the worker `concertium`. Renamed `wrangler.jsonc` to `concertium-dashboard` to
match, including the `WORKER_SELF_REFERENCE` service binding target.

### 5. Native query engine binary was still bundled — fixed, and was the real blocker

`engineType = "client"` was missing from the `generator client` block.
Without it, Prisma 7 + `adapter-d1` *still* generates and bundles
`libquery_engine-*.node` (confirmed by inspecting `.open-next/` — it was
there). That binary can never load in a Workers isolate on any platform, so
every prior "it builds" result for the database layer was inconclusive by
construction — the crash would only happen on the first real query. Setting
`engineType = "client"` produces a pure-JS query compiler instead; verified
zero `.node`/`.dylib`/`.so` files in the bundle after the change.

### 6. Six commits behind `main` — merged

Merged (not rebased — fewer, cleaner conflicts) the per-project access-control
work (`ProjectMember`, `ClientAssignment`, `src/lib/access.ts`,
`src/app/actions/access.ts`, access scoping across read/write paths).
`schema.prisma` merged cleanly (sqlite provider preserved, new models added).
Two follow-on breaks from the SQLite/D1 switch, both fixed:

- `createMany({ skipDuplicates: true })` doesn't typecheck on SQLite (Prisma
  narrows the option to `never` for providers that don't support
  `INSERT ... ON CONFLICT DO NOTHING` at the `createMany` level) — switched
  `prisma/backfill-access.ts` to per-row `upsert` against each model's
  `@@unique` compound key, and dropped the flag entirely in
  `src/app/actions/projects.ts` where it was a no-op (a just-created project
  can't already have members).
- The regenerated `migrations/0001_init.sql` (via `prisma migrate diff
  --from-empty --to-schema prisma/schema.prisma --script`) now includes the
  `ProjectMember`/`ClientAssignment` tables the pre-merge version was missing.

### 7. Runtime D1 connectivity — proven

Never verified before. Confirmed by deploying and hitting `/register`, which
runs `await prisma.user.count()` server-side on every render: it correctly
reported `0` against the freshly migrated, empty D1 database — a real query,
through the real adapter, from inside the real Workers runtime, not a build
or dry-run artifact.

### Email — still stubbed, unchanged

`src/lib/email.ts` hardcodes `isEmailConfigured()` to `false`. Nodemailer
needs raw TCP, which Workers doesn't have. Alerts and weekly reports still
silently send nothing. Needs an HTTP email API (Resend, SendGrid,
MailChannels) before automations mean anything on this branch. Not blocking
for a first deploy; blocking for automations to be useful.

---

## The unresolved question: the data

**This is a datastore change, not a driver change.** Live client, project and
user data is in Hostinger MySQL. The deployed D1 database has the schema but
zero real rows. Deploying as-is gives you a working app in front of an empty
database.

A migration script exists: `scripts/migrate-mysql-to-d1.mjs`
(`npm run migrate:mysql-to-d1`). It has **not been run against production** —
no MySQL credentials with network access to Hostinger were available when it
was written, and it has only been syntax-checked, not exercised against a
real database. Before running it for real:

1. **Get Hostinger MySQL reachable.** Hostinger's MySQL is `localhost`-only by
   default — enable "Remote MySQL" in hPanel, or run the script from the
   Hostinger host itself, or tunnel.
2. **Dry-run first**: `MYSQL_URL="mysql://..." npm run migrate:mysql-to-d1 --
   --dry-run` prints row counts and one transformed sample row per table,
   writes nothing. Confirm counts match what you expect and the sample rows
   look right (dates as ISO strings, booleans as 0/1) before generating SQL.
3. **Generate, then review, the SQL**: drop `--dry-run` (optionally `-- --out
   migration.sql`) to write an INSERT-statement file in FK-safe order. Read
   it before applying it.
4. **Apply to a fresh/scratch D1 database first**, not the one already
   deployed to production traffic — `npx wrangler d1 execute <db> --remote
   --file migration.sql` — and manually spot-check rows via `wrangler d1
   execute <db> --remote --command "SELECT ..."` before pointing the real
   deployment at it.
5. Only then re-point `wrangler.jsonc`'s `d1_databases[0].database_id` (or
   swap data into the existing one) and redeploy.

The schema here has no `Decimal` fields and no MySQL `AUTOINCREMENT` ids
(everything uses `cuid()` strings already), which removes two of the usual
migration hazards. What the script does handle: MySQL `tinyint(1)` booleans
→ SQLite `0`/`1` (`weeklyReportEnabled`, `weeklyReport`), and MySQL
`DATETIME` → ISO-8601 text matching what Prisma itself writes for SQLite
(every `DateTime` column, enumerated by name in the script since the source
MySQL driver doesn't expose Prisma's field types directly).

Before this can ship: someone still has to decide whether D1 is actually the
target, versus MySQL-over-Hyperdrive (keeps data in place, needs
`@prisma/adapter-mariadb` and Remote MySQL enabled — no `engineType =
"client"` equivalent has been verified for that adapter) or staying on
Hostinger entirely (`DEPLOYMENT.md`, already working). That decision was
D1 as of 2026-09-10.

---

## Known-good facts worth keeping

- Cloudflare's Worker size limit is **64 MiB uncompressed**, same on free and
  paid plans. No gzip limit. Current bundle: 14.7 MB uncompressed / 3.7 MB
  gzip.
- `cloudflare-env.d.ts` is gitignored and **must be generated** with
  `npm run cf-typegen` after any `wrangler.jsonc` change, or the build fails
  with `Cannot find name 'ScheduledEvent' / 'ExecutionContext'`.
- Secrets set: `AUTH_SECRET`, `CRON_SECRET` (via `wrangler secret put`). No
  `.dev.vars` has been created for local dev against the deployed Worker.
- `compatibility_flags` are `nodejs_compat` and `global_fetch_strictly_public`;
  `compatibility_date` is `2026-09-09`.
- A clean build/dry-run deploy is not proof of anything at the database layer
  — see fix #5 above. Always confirm with an actual `wrangler deploy` and a
  real request that touches the database.

---

## Suggested order when resuming

1. Get Hostinger Remote MySQL access (or another path to the data) sorted.
2. Dry-run `scripts/migrate-mysql-to-d1.mjs` against production, verify counts
   and sample rows.
3. Migrate into a **scratch** D1 database first, spot-check, then move to the
   real one.
4. Pick an HTTP email provider and un-stub `email.ts` before relying on
   automations.
5. Re-run the `/register` bootstrap check (or equivalent) against the
   populated database before calling this done.
