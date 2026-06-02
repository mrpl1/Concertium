import { NextRequest, NextResponse } from "next/server";
import { sendAlertDigest, runWeeklyReports } from "@/lib/automations";

export const dynamic = "force-dynamic";

// Scheduled automation endpoint. Point an external scheduler (system cron,
// Vercel Cron, GitHub Actions, etc.) at this URL once a day, e.g.:
//   curl -s "https://your-host/api/cron?secret=$CRON_SECRET"
//
// It always sends the daily alert digest, and additionally sends weekly client
// reports when today matches WEEKLY_REPORT_DAY (0=Sun … 6=Sat, default 5=Fri).
async function handle(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not set; the cron endpoint is disabled." },
      { status: 503 }
    );
  }

  const provided =
    req.nextUrl.searchParams.get("secret") ||
    req.headers.get("x-cron-secret") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    "";
  if (provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const alerts = await sendAlertDigest({ sendIfEmpty: false });

  const weeklyDay = Number(process.env.WEEKLY_REPORT_DAY ?? 5);
  const force = req.nextUrl.searchParams.get("weekly") === "1";
  let weekly = null;
  if (force || new Date().getDay() === weeklyDay) {
    weekly = await runWeeklyReports();
  }

  return NextResponse.json({ ran: new Date().toISOString(), alerts, weekly });
}

export const GET = handle;
export const POST = handle;
