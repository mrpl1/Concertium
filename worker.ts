// Cloudflare Workers entrypoint. Wraps the OpenNext-generated fetch handler
// and adds a scheduled() handler for the cron trigger, replacing the old
// setInterval-based in-process scheduler (src/lib/scheduler.ts, removed) —
// Workers has no long-lived process between requests for that to run in.
// @ts-expect-error — .open-next/worker.js is generated at build time
import openNextHandler from "./.open-next/worker.js";

export default {
  fetch: openNextHandler.fetch,
  async scheduled(
    _event: ScheduledEvent,
    env: CloudflareEnv,
    ctx: ExecutionContext
  ) {
    // worker.ts is bundled by wrangler outside the Next build. Importing
    // @/lib/automations directly pulls in the "server-only" package, which
    // throws unconditionally when loaded by any bundler other than Next's own
    // ("This module cannot be imported from a Client Component module") —
    // fails at deploy time with a cryptic 10021 validation error, even though
    // it typechecks and builds fine. Self-fetch the existing /api/cron route
    // through the WORKER_SELF_REFERENCE service binding instead.
    ctx.waitUntil(
      env.WORKER_SELF_REFERENCE!.fetch(
        `https://self/api/cron?secret=${encodeURIComponent(env.CRON_SECRET ?? "")}`
      )
        .then(async (res: Response) => {
          console.log("[cron]", res.status, await res.text());
        })
        .catch((err: unknown) => {
          console.error("[cron] self-fetch failed:", err);
        })
    );
  },
};
