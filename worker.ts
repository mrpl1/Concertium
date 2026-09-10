// Cloudflare Workers entrypoint. Wraps the OpenNext-generated fetch handler
// and adds a scheduled() handler for the cron trigger, replacing the old
// setInterval-based in-process scheduler (src/lib/scheduler.ts, removed) —
// Workers has no long-lived process between requests for that to run in.
// @ts-expect-error — .open-next/worker.js is generated at build time
import openNextHandler from "./.open-next/worker.js";
import { sendAllAlertDigests, runAllWeeklyReports } from "@/lib/automations";

export default {
  fetch: openNextHandler.fetch,
  async scheduled(
    _event: ScheduledEvent,
    env: CloudflareEnv,
    ctx: ExecutionContext
  ) {
    // Mirrors src/app/api/cron/route.ts's logic, called in-process instead of
    // via HTTP self-fetch — no CRON_SECRET round-trip needed here since this
    // only runs from Cloudflare's own cron trigger, not a public request.
    // Both helpers iterate every workspace, each getting its own digest.
    ctx.waitUntil(
      (async () => {
        const alerts = await sendAllAlertDigests({ sendIfEmpty: false });
        console.log("[cron] alert digest:", JSON.stringify(alerts));

        const weeklyDay = Number(env.WEEKLY_REPORT_DAY ?? 5);
        if (new Date().getDay() === weeklyDay) {
          const weekly = await runAllWeeklyReports();
          console.log("[cron] weekly reports:", JSON.stringify(weekly));
        }
      })()
    );
  },
};
