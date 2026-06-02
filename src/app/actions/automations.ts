"use server";

import { getSessionUser } from "@/lib/auth";
import { sendAlertDigest, runWeeklyReports } from "@/lib/automations";

export type AutomationState = { ok?: string; error?: string } | undefined;

async function requireAdmin(): Promise<string | null> {
  const u = await getSessionUser();
  if (!u || u.role !== "admin") return "Admins only.";
  return null;
}

export async function runAlertsNowAction(): Promise<AutomationState> {
  const err = await requireAdmin();
  if (err) return { error: err };
  try {
    const r = await sendAlertDigest({ sendIfEmpty: true });
    const channels: string[] = [];
    if (r.emailSentTo.length) channels.push(`email → ${r.emailSentTo.join(", ")}`);
    if (r.slackSent) channels.push("Slack");
    if (!channels.length)
      return {
        error:
          "Nothing was sent — configure SMTP and/or SLACK_WEBHOOK_URL in .env first.",
      };
    return {
      ok: `Alert digest sent (${r.counts.overdue} overdue, ${r.counts.atRisk} at risk, ${r.counts.dueSoon} due soon) via ${channels.join(" and ")}.`,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to send alerts." };
  }
}

export async function runWeeklyReportsNowAction(): Promise<AutomationState> {
  const err = await requireAdmin();
  if (err) return { error: err };
  try {
    const r = await runWeeklyReports();
    if (r.sent.length === 0)
      return {
        ok: `No reports sent.${r.skipped.length ? ` Skipped: ${r.skipped.join(", ")}.` : " No clients are opted in."}`,
      };
    return { ok: `Sent ${r.sent.length} weekly report(s): ${r.sent.map((s) => `${s.client} → ${s.to}`).join("; ")}.` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to send reports." };
  }
}
