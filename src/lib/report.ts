// Pure report-building helpers — no DB or server dependencies, so they can be
// used on the server (for sending) and shared with the client (for previews).

export type ReportProject = {
  name: string;
  status: string;
  priority: string;
  progress: number;
  dueDate: Date | string | null;
  ownerName?: string | null;
  description?: string | null;
  latestUpdate?: string | null;
};

export type ReportClient = {
  name: string;
  company?: string | null;
};

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export type BuiltReport = {
  subject: string;
  text: string;
  html: string;
};

export function buildReport(opts: {
  client?: ReportClient | null;
  projects: ReportProject[];
  asOf?: Date;
  intro?: string;
  authorName?: string;
  // Optional label shown in the footer (e.g. the workspace name). When absent,
  // the footer stays generic with no product branding.
  brand?: string;
}): BuiltReport {
  const asOf = opts.asOf ?? new Date();
  const asOfStr = formatDate(asOf);
  const scope = opts.client
    ? `${opts.client.company || opts.client.name}`
    : "All Clients";

  const subject = `Status Report — ${scope} — ${asOfStr}`;

  const total = opts.projects.length;
  const byStatus: Record<string, number> = {};
  for (const p of opts.projects) {
    byStatus[p.status] = (byStatus[p.status] || 0) + 1;
  }
  const summaryLine = Object.entries(byStatus)
    .map(([s, n]) => `${n} ${s}`)
    .join(", ");

  // ---- Plain text ----
  const textLines: string[] = [];
  textLines.push(`STATUS REPORT — ${scope}`);
  textLines.push(`As of ${asOfStr}`);
  if (opts.authorName) textLines.push(`Prepared by ${opts.authorName}`);
  textLines.push("");
  if (opts.intro && opts.intro.trim()) {
    textLines.push(opts.intro.trim());
    textLines.push("");
  }
  textLines.push(`Summary: ${total} project(s)${summaryLine ? ` — ${summaryLine}` : ""}`);
  textLines.push("");
  for (const p of opts.projects) {
    textLines.push(`• ${p.name} [${p.status}] — ${p.progress}% complete`);
    const meta: string[] = [];
    if (p.priority) meta.push(`Priority: ${p.priority}`);
    if (p.ownerName) meta.push(`Owner: ${p.ownerName}`);
    meta.push(`Due: ${formatDate(p.dueDate)}`);
    textLines.push(`   ${meta.join("  |  ")}`);
    if (p.latestUpdate && p.latestUpdate.trim()) {
      textLines.push(`   Latest: ${p.latestUpdate.trim()}`);
    }
    textLines.push("");
  }
  const text = textLines.join("\n").trimEnd();

  // ---- HTML ----
  const rows = opts.projects
    .map(
      (p) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">
          <strong>${escapeHtml(p.name)}</strong>
          ${p.latestUpdate && p.latestUpdate.trim() ? `<div style="color:#555;font-size:13px;margin-top:2px;">${escapeHtml(p.latestUpdate.trim())}</div>` : ""}
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;white-space:nowrap;">${escapeHtml(p.status)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${p.progress}%</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;white-space:nowrap;">${escapeHtml(formatDate(p.dueDate))}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;white-space:nowrap;">${escapeHtml(p.ownerName || "—")}</td>
      </tr>`
    )
    .join("");

  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;max-width:720px;">
    <h2 style="margin:0 0 4px;">Status Report — ${escapeHtml(scope)}</h2>
    <p style="margin:0 0 16px;color:#666;">As of ${escapeHtml(asOfStr)}${opts.authorName ? ` · Prepared by ${escapeHtml(opts.authorName)}` : ""}</p>
    ${opts.intro && opts.intro.trim() ? `<p style="margin:0 0 16px;">${escapeHtml(opts.intro.trim()).replace(/\n/g, "<br>")}</p>` : ""}
    <p style="margin:0 0 16px;"><strong>Summary:</strong> ${total} project(s)${summaryLine ? ` — ${escapeHtml(summaryLine)}` : ""}</p>
    <table style="border-collapse:collapse;width:100%;font-size:14px;">
      <thead>
        <tr style="text-align:left;background:#f6f7f9;">
          <th style="padding:8px 12px;border-bottom:2px solid #e5e7eb;">Project</th>
          <th style="padding:8px 12px;border-bottom:2px solid #e5e7eb;">Status</th>
          <th style="padding:8px 12px;border-bottom:2px solid #e5e7eb;text-align:right;">Progress</th>
          <th style="padding:8px 12px;border-bottom:2px solid #e5e7eb;">Due</th>
          <th style="padding:8px 12px;border-bottom:2px solid #e5e7eb;">Owner</th>
        </tr>
      </thead>
      <tbody>${rows || `<tr><td colspan="5" style="padding:12px;color:#888;">No projects.</td></tr>`}</tbody>
    </table>
    <p style="margin:20px 0 0;color:#999;font-size:12px;">${
      opts.brand ? `Sent via ${escapeHtml(opts.brand)}` : "Automated status report"
    }</p>
  </div>`;

  return { subject, text, html };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
