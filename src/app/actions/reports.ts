"use server";

import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { clientScope, projectScope } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { buildReport, type BuiltReport, type ReportProject } from "@/lib/report";
import { isEmailConfigured, sendEmail } from "@/lib/email";

export type GenerateState =
  | {
      ok: true;
      report: BuiltReport;
      suggestedTo: string;
      emailConfigured: boolean;
    }
  | { ok: false; error: string }
  | undefined;

async function gatherProjects(clientId: string, user: SessionUser) {
  const scope = projectScope(user);
  const where =
    clientId && clientId !== "all" ? { ...scope, clientId } : scope;
  return prisma.project.findMany({
    where,
    include: {
      owner: true,
      client: true,
      updates: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
  });
}

function toReportProjects(
  projects: Awaited<ReturnType<typeof gatherProjects>>
): ReportProject[] {
  return projects.map((p) => ({
    name: p.name,
    status: p.status,
    priority: p.priority,
    progress: p.progress,
    dueDate: p.dueDate,
    ownerName: p.owner?.name ?? null,
    description: p.description,
    latestUpdate: p.updates[0]?.body ?? null,
  }));
}

export async function generateReportAction(
  _prev: GenerateState,
  formData: FormData
): Promise<GenerateState> {
  const user = await requireUser();
  const clientId = String(formData.get("clientId") || "all");
  const intro = String(formData.get("intro") || "");

  const projects = await gatherProjects(clientId, user);

  let client = null;
  let suggestedTo = "";
  if (clientId && clientId !== "all") {
    const c = await prisma.client.findFirst({
      where: { id: clientId, ...clientScope(user) },
    });
    if (!c) return { ok: false, error: "Client not found." };
    client = { name: c.name, company: c.company };
    suggestedTo = c.email || "";
  }

  const report = buildReport({
    client,
    projects: toReportProjects(projects),
    intro,
    authorName: user.name,
  });

  return {
    ok: true,
    report,
    suggestedTo,
    emailConfigured: isEmailConfigured(),
  };
}

export type SendState =
  | { ok: true; message: string }
  | { ok: false; error: string }
  | undefined;

export async function sendReportAction(
  _prev: SendState,
  formData: FormData
): Promise<SendState> {
  const user = await requireUser();
  const clientId = String(formData.get("clientId") || "all");
  const intro = String(formData.get("intro") || "");
  const to = String(formData.get("to") || "").trim();

  if (!to) return { ok: false, error: "Please enter a recipient email address." };
  if (!isEmailConfigured()) {
    return {
      ok: false,
      error:
        "Automatic sending is not configured. Set SMTP_* variables in your .env, or use the 'Open in mail client' option instead.",
    };
  }

  const projects = await gatherProjects(clientId, user);
  let client = null;
  if (clientId && clientId !== "all") {
    const c = await prisma.client.findFirst({
      where: { id: clientId, ...clientScope(user) },
    });
    if (c) client = { name: c.name, company: c.company };
  }

  const report = buildReport({
    client,
    projects: toReportProjects(projects),
    intro,
    authorName: user.name,
  });

  try {
    await sendEmail({
      to,
      subject: report.subject,
      text: report.text,
      html: report.html,
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to send email.",
    };
  }

  return { ok: true, message: `Report sent to ${to}.` };
}
