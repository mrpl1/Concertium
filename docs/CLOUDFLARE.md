# Cloudflare Workers port — parked

**Status as of 2026-09-10: parked deliberately.** Production is unaffected and
stays on Hostinger. This branch (`cloudflare-d1`) is a spike, not a release
candidate. Nothing here is deployed.

Read this before picking the work back up. Several things are further along
than they look, and several are more broken than they look.

---

## What this branch actually is

An [OpenNext](https://opennext.js.org/cloudflare) port of the app to Cloudflare
Workers, with the datastore moved from **MySQL to Cloudflare D1** (SQLite).

The move off Prisma 5 is not optional. Prisma 5 ships a ~16 MB native query
engine (`libquery_engine-*.so.node`); Workers cannot load a native binary, so
Prisma 5 can never run there regardless of bundle size. That forces Prisma 7
plus a driver adapter, and the adapter choice is what picks the database.

| | |
| --- | --- |
| Branch | `cloudflare-d1`, one commit on top of `cloudflare` |
| Prisma | 7.10 with `@prisma/adapter-d1` |
| `schema.prisma` provider | `sqlite` (was `mysql`) |
| Migrations | `migrations/0001_init.sql`, via `prisma migrate diff` |
| D1 database | `concertium`, id `094db8e6-7001-4a84-80f6-2f4350bf58c6` (exists) |
| Worker name in `wrangler.jsonc` | `concertium` |
| Behind `main` by | 6 commits |

### Recovered, not authored

The commit on this branch was recovered from an uncommitted working tree in
`~/Concertium-cloudflare` that had no branch or ref pointing at it. One
`git worktree prune` would have destroyed it. If you find another detached
worktree, check it before cleaning it up.

An earlier spike (`spike/prisma7` @ `82fb256`, Prisma 7 over **MySQL** via
Hyperdrive and `@prisma/adapter-mariadb`) is **gone** — not in any ref, not in
the object database, no bundle. It reportedly built clean with zero native
binaries at 15,983 KiB uncompressed. If MySQL-over-Hyperdrive is the direction
you want, that work needs redoing from scratch.

---

## Blockers, most severe first

### 1. `worker.ts` is written against a pre-multi-tenancy API

It will not typecheck, and if it did it would misbehave:

```ts
const alerts = await sendAlertDigest({ sendIfEmpty: false });   // WRONG
const weekly = await runWeeklyReports();                        // WRONG
```

The actual signatures on this branch are `sendAlertDigest(workspaceId, opts)`
and `runWeeklyReports(workspaceId)`. The first call passes the options object
where a workspace id belongs; the second passes nothing at all.

The right calls are the workspace-iterating variants that already exist and
that `src/app/api/cron/route.ts` uses — `sendAllAlertDigests(opts)` and
`runAllWeeklyReports()`. Note `runAllWeeklyReports` also honours each
workspace's `weeklyReportEnabled` flag, which the single-workspace function
does not.

### 2. `worker.ts` imports app code, which breaks the build

```ts
import { sendAlertDigest, runWeeklyReports } from "@/lib/automations";
```

`worker.ts` is bundled by wrangler *outside* the Next build, where the
`server-only` package cannot resolve. This fails with **"Could not resolve
server-only"**. This was solved once before and the fix was lost: call
`/api/cron` over the `WORKER_SELF_REFERENCE` service binding instead of
importing anything from `src/`. That binding is **already declared** in
`wrangler.jsonc` and currently unused — it exists for exactly this.

The cron route wants `CRON_SECRET`, so the self-call has to pass it.

### 3. The cron trigger can never fire

```jsonc
"triggers": { "crons": [] }
```

An empty array means Cloudflare never invokes `scheduled()`. This regressed
once already. `["0 8 * * *"]` is the intended value. Note `src/lib/scheduler.ts`
and `src/instrumentation.ts` were deleted on this branch — Workers has no
long-lived process for a `setInterval` scheduler — so the cron trigger is the
*only* thing that would run alert digests and weekly reports. With it empty,
automations silently never run.

### 4. Worker name mismatch with the connected build

`wrangler.jsonc` names the worker `concertium`. The GitHub check on the repo is
**`Workers Builds: concertium-dashboard`**, and it fails in **0 seconds** on
every commit to every branch, including `main` — it never gets as far as
building. Two names, one of them wrong. Decide which is canonical and make the
Cloudflare Workers Build settings and `wrangler.jsonc` agree, or disconnect the
build until this branch is ready so it stops redding-out unrelated PRs.

### 5. Email is stubbed out

`src/lib/email.ts` hardcodes `isEmailConfigured()` to `false`. Nodemailer needs
raw TCP, which Workers does not have. Every call site takes its existing
"skip if not configured" path, so alerts and weekly reports **silently send
nothing**. Marked `TODO(cloudflare-migration)`. Needs an HTTP email API —
Resend, SendGrid or MailChannels — before automations mean anything.

### 6. Six commits behind `main`

Missing the per-project access-control work: `ProjectMember`,
`ClientAssignment`, `src/lib/access.ts`, `src/app/actions/access.ts`,
`src/components/AccessPanel.tsx`, `prisma/backfill-access.ts`, and the read/write
scoping across the app. Those touch `schema.prisma`, which on this branch has
been retyped for SQLite — so this rebase is not mechanical.

This branch also re-adds `.github/workflows/deploy.yml`, deleted on `main`,
because it merged a `main` from before that deletion.

### 7. Scripts that cannot work on D1

`predev`, `setup`, `db:push` and `db:reset` all call `prisma db push`. D1
supports neither `db push` nor `migrate dev`; migrations go through
`wrangler d1 migrations apply`. `db:backfill` points at
`prisma/backfill-workspace.ts` and would need to run against D1 too.

---

## The unresolved question: the data

**This is a datastore change, not a driver change.** Live client, project and
user data is in Hostinger MySQL. Nothing on this branch moves it into D1, and
D1 is SQLite — a different engine with different types, not a MySQL replica.
Deploying this as-is gives you a working app in front of an empty database.

Before this can ship, someone has to decide and then build one of:

1. **Export and transform.** Dump MySQL, convert types, load into D1 via
   `wrangler d1 execute`. Watch `DateTime`, `Decimal`, enum-ish strings, and
   `AUTOINCREMENT` vs `cuid()` defaults. D1 also has per-database size and
   per-query row limits worth checking against current data volume.
2. **Go back to MySQL over Hyperdrive.** Keeps the data exactly where it is.
   Costs the D1 work on this branch, needs Prisma 7 with
   `@prisma/adapter-mariadb`, and needs **Remote MySQL enabled in hPanel** —
   Hostinger's MySQL is `localhost`-only by default and unreachable from
   Cloudflare otherwise. This is what the lost `spike/prisma7` did.
3. **Stay on Hostinger.** The zip-upload deploy is documented and working; see
   `DEPLOYMENT.md`. Nothing forces this migration.

Also never verified, on either path: **runtime database connectivity from
inside workerd**. No adapter has ever been exercised against a live database
from a Worker. Until that is proven, treat every "it builds" result as
inconclusive.

---

## Known-good facts worth keeping

- Cloudflare's Worker size limit is **64 MiB uncompressed**, the same on free
  and paid plans. There is no gzip limit; the gzip number wrangler prints is
  informational. The on-disk size of `.open-next/` is meaningless — wrangler
  tree-shakes hard (108 MB on disk became 15.6 MiB bundled).
- `cloudflare-env.d.ts` is gitignored and **must be generated** with
  `npm run cf-typegen`, or the build fails with `Cannot find name
  'ScheduledEvent' / 'ExecutionContext'`. It also supplies the `CloudflareEnv`
  interface that `worker.ts` refers to.
- No secrets are set anywhere yet. `AUTH_SECRET` and `CRON_SECRET` need
  `wrangler secret put` plus a local `.dev.vars` (gitignored).
- `compatibility_flags` are `nodejs_compat` and `global_fetch_strictly_public`;
  `compatibility_date` is `2026-09-09`.

---

## Suggested order when resuming

1. Decide the datastore question above. Everything else is wasted effort until
   that is settled.
2. Fix or disconnect the `concertium-dashboard` build so unrelated PRs stop
   showing a red X.
3. Rewrite `worker.ts`: self-fetch `/api/cron` through `WORKER_SELF_REFERENCE`,
   drop the `@/lib` import.
4. Set `triggers.crons` to `["0 8 * * *"]`.
5. Rebase onto `main`, resolving `schema.prisma` by hand.
6. Pick an HTTP email provider and un-stub `email.ts`.
7. Prove runtime connectivity against a scratch database before touching
   production data.
