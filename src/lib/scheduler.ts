// In-process scheduler for an always-on deployment (e.g. your Mac mini).
// Enabled with ENABLE_SCHEDULER=true. While the server is running it sends the
// daily alert digest at ~SCHEDULER_HOUR local time, and weekly client reports
// on WEEKLY_REPORT_DAY. No external cron needed.
//
// Do NOT also run the launchd/external cron at the same time, or alerts will
// be sent twice — pick one mechanism.

let started = false;

export function startScheduler() {
  if (started) return;
  if (process.env.ENABLE_SCHEDULER !== "true") return;
  started = true;

  const hour = Number(process.env.SCHEDULER_HOUR ?? 8);
  const weeklyDay = Number(process.env.WEEKLY_REPORT_DAY ?? 5);
  let lastDailyKey = "";
  let lastWeeklyKey = "";

  const tick = async () => {
    try {
      const now = new Date();
      const dayKey = now.toDateString();
      if (now.getHours() < hour || lastDailyKey === dayKey) return;
      lastDailyKey = dayKey;

      const { sendAllAlertDigests, runAllWeeklyReports } = await import("./automations");

      const alerts = await sendAllAlertDigests({ sendIfEmpty: false });
      console.log("[scheduler] alert digests:", JSON.stringify(alerts));

      if (now.getDay() === weeklyDay && lastWeeklyKey !== dayKey) {
        lastWeeklyKey = dayKey;
        const weekly = await runAllWeeklyReports();
        console.log("[scheduler] weekly reports:", JSON.stringify(weekly));
      }
    } catch (e) {
      console.error("[scheduler] error:", e);
    }
  };

  // Run shortly after boot, then check every 15 minutes.
  setTimeout(tick, 10_000);
  setInterval(tick, 15 * 60 * 1000);
  console.log(
    `[scheduler] enabled — daily alerts at ~${hour}:00 local, weekly reports on day ${weeklyDay}`
  );
}
