import "server-only";
import { prisma } from "@/lib/db";
import { computeRisk } from "@/lib/risk";
import { buildReport, formatDate, type ReportProject } from "@/lib/report";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { isSlackConfigured, sendSlack } from "@/lib/slack";

const DAY = 1000 * 60 * 60 * 24;

export type AlertDigest = {
  empty: boolean;
  subject: string;
  text: string;
  html: string;
  slackText: string;
  counts: { overdue: number; atRisk: number; dueSoon: number };
};

// Scan a workspace's active projects and build a digest of what needs
// attention. Scoped to a single workspace for tenant isolation.
export async function buildAlertDigest(
  workspaceId: string,
  now = Date.now()
): Promise<AlertDigest> {
  const projects = await prisma.project.findMany({
    where: { workspaceId, status: { not: "Completed" } },
    include: {
      client: true,
      deliverables: { select: { status: true, dueDate: true } },
      updates: { select: { createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  const overdue: string[] = [];
  const atRisk: string[] = [];
  const dueSoon: string[] = [];

  for (const p of projects) {
    const risk = computeRisk(
      {
        status: p.status,
        progress: p.progress,
        dueDate: p.dueDate ? p.dueDate.getTime() : null,
        lastUpdateAt: p.updates[0]?.createdAt.getTime() ?? null,
        deliverables: p.deliverables.map((d) => ({
          status: d.status,
          dueDate: d.dueDate ? d.dueDate.getTime() : null,
        })),
      },
      now
    );
    const client = p.client.company || p.client.name;
    const line = `${p.name} (${client}) — ${risk.reasons.join("; ")}`;
    if (risk.level === "overdue") overdue.push(line);
    else if (risk.level === "at-risk") atRisk.push(line);

    // Due within 7 days (and not already flagged overdue).
    if (p.dueDate) {
      const daysLeft = Math.ceil((p.dueDate.getTime() - now) / DAY);
      if (daysLeft >= 0 && daysLeft <= 7) {
        dueSoon.push(`${p.name} (${client}) — due ${formatDate(p.dueDate)} (${daysLeft}d)`);
      }
    }
  }

  const counts = { overdue: overdue.length, atRisk: atRisk.length, dueSoon: dueSoon.length };
  const empty = counts.overdue + counts.atRisk + counts.dueSoon === 0;

  const section = (title: string, items: string[]) =>
    items.length ? `${title}:\n${items.map((i) => `  • ${i}`).join("\n")}\n` : "";

  const text = empty
    ? "All projects are on track. Nothing overdue, at risk, or due in the next 7 days."
    : [
        section("⛔ Overdue", overdue),
        section("⚠️ At risk", atRisk),
        section("📅 Due within 7 days", dueSoon),
      ]
        .filter(Boolean)
        .join("\n");

  const htmlSection = (title: string, items: string[], color: string) =>
    items.length
      ? `<h3 style="color:${color};margin:16px 0 6px;">${title}</h3><ul style="margin:0;padding-left:18px;">${items
          .map((i) => `<li style="margin:2px 0;">${escapeHtml(i)}</li>`)
          .join("")}</ul>`
      : "";

  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1a1a1a;max-width:680px;">
    <h2 style="margin:0 0 4px;">Concertium — Daily Project Alerts</h2>
    <p style="color:#666;margin:0 0 8px;">As of ${formatDate(new Date(now))}</p>
    ${empty ? "<p>All projects are on track. 🎉</p>" : htmlSection("⛔ Overdue", overdue, "#b91c1c") + htmlSection("⚠️ At risk", atRisk, "#b45309") + htmlSection("📅 Due within 7 days", dueSoon, "#1d4ed8")}
  </div>`;

  const slackText = empty
    ? "*Concertium daily alerts:* all projects on track. :tada:"
    : `*Concertium daily alerts* (${counts.overdue} overdue, ${counts.atRisk} at risk, ${counts.dueSoon} due soon)\n\n${text}`;

  return {
    empty,
    subject: empty
      ? "Concertium: all projects on track"
      : `Concertium alerts: ${counts.overdue} overdue, ${counts.atRisk} at risk`,
    text,
    html,
    slackText,
    counts,
  };
}

// Email recipients for a workspace's alert digest: NOTIFY_EMAIL (global
// fallback) if set, otherwise the workspace's own admin users.
async function alertRecipients(workspaceId: string): Promise<string[]> {
  const fromEnv = (process.env.NOTIFY_EMAIL || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (fromEnv.length) return fromEnv;
  const admins = await prisma.user.findMany({
    where: { role: "admin", workspaceId },
    select: { email: true },
  });
  return admins.map((u) => u.email);
}

export type SendResult = {
  empty: boolean;
  emailSentTo: string[];
  slackSent: boolean;
  counts: AlertDigest["counts"];
};

// Send a single workspace's alert digest via email (to NOTIFY_EMAIL or that
// workspace's admins) and to that workspace's Slack webhook. When sendIfEmpty
// is false, a clean digest is skipped silently.
export async function sendAlertDigest(
  workspaceId: string,
  opts: { sendIfEmpty?: boolean } = {}
): Promise<SendResult> {
  const digest = await buildAlertDigest(workspaceId);
  const result: SendResult = { empty: digest.empty, emailSentTo: [], slackSent: false, counts: digest.counts };

  if (digest.empty && !opts.sendIfEmpty) return result;

  if (isEmailConfigured()) {
    const recipients = await alertRecipients(workspaceId);
    for (const to of recipients) {
      await sendEmail({ to, subject: digest.subject, text: digest.text, html: digest.html });
      result.emailSentTo.push(to);
    }
  }
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (isSlackConfigured(workspace?.slackWebhookUrl)) {
    await sendSlack(workspace?.slackWebhookUrl ?? null, digest.slackText);
    result.slackSent = true;
  }
  return result;
}

export type AllSendResult = {
  workspaceId: string;
  workspaceName: string;
  result: SendResult;
};

// Iterate every workspace and send each its own digest to its own channels.
export async function sendAllAlertDigests(
  opts: { sendIfEmpty?: boolean } = {}
): Promise<AllSendResult[]> {
  const workspaces = await prisma.workspace.findMany({
    select: { id: true, name: true },
  });
  const out: AllSendResult[] = [];
  for (const w of workspaces) {
    const result = await sendAlertDigest(w.id, opts);
    out.push({ workspaceId: w.id, workspaceName: w.name, result });
  }
  return out;
}

export type WeeklyResult = { sent: { client: string; to: string }[]; skipped: string[] };

// Email a status report to every opted-in client in a single workspace.
export async function runWeeklyReports(workspaceId: string): Promise<WeeklyResult> {
  const out: WeeklyResult = { sent: [], skipped: [] };
  if (!isEmailConfigured()) {
    out.skipped.push("SMTP not configured");
    return out;
  }

  const clients = await prisma.client.findMany({
    where: { weeklyReport: true, workspaceId },
  });
  for (const c of clients) {
    if (!c.email) {
      out.skipped.push(`${c.company || c.name} (no email)`);
      continue;
    }
    const projects = await prisma.project.findMany({
      where: { clientId: c.id },
      include: { owner: true, updates: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    });
    const reportProjects: ReportProject[] = projects.map((p) => ({
      name: p.name,
      status: p.status,
      priority: p.priority,
      progress: p.progress,
      dueDate: p.dueDate,
      ownerName: p.owner?.name ?? null,
      latestUpdate: p.updates[0]?.body ?? null,
    }));
    const report = buildReport({
      client: { name: c.name, company: c.company },
      projects: reportProjects,
    });
    await sendEmail({ to: c.email, subject: report.subject, text: report.text, html: report.html });
    await prisma.client.update({ where: { id: c.id }, data: { lastReportSentAt: new Date() } });
    out.sent.push({ client: c.company || c.name, to: c.email });
  }
  return out;
}

// Iterate every workspace that has weekly reports enabled and run its reports.
export async function runAllWeeklyReports(): Promise<
  { workspaceId: string; workspaceName: string; result: WeeklyResult }[]
> {
  const workspaces = await prisma.workspace.findMany({
    where: { weeklyReportEnabled: true },
    select: { id: true, name: true },
  });
  const out: { workspaceId: string; workspaceName: string; result: WeeklyResult }[] = [];
  for (const w of workspaces) {
    const result = await runWeeklyReports(w.id);
    out.push({ workspaceId: w.id, workspaceName: w.name, result });
  }
  return out;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
