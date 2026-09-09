"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type WorkspaceSettingsState = { ok?: string; error?: string } | undefined;

// Admin-only: update the current workspace's Slack webhook and weekly-report
// toggle. Scoped to the admin's own workspace.
export async function updateWorkspaceSettingsAction(
  _prev: WorkspaceSettingsState,
  formData: FormData
): Promise<WorkspaceSettingsState> {
  const current = await getSessionUser();
  if (!current || current.role !== "admin") {
    return { error: "Only admins can change workspace settings." };
  }

  const slackRaw = String(formData.get("slackWebhookUrl") || "").trim();
  if (slackRaw && !/^https?:\/\//i.test(slackRaw)) {
    return { error: "Slack webhook URL must start with http(s)://" };
  }
  const weeklyReportEnabled = formData.get("weeklyReportEnabled") === "on";

  await prisma.workspace.update({
    where: { id: current.workspaceId },
    data: {
      slackWebhookUrl: slackRaw || null,
      weeklyReportEnabled,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/automations");
  return { ok: "Workspace settings saved." };
}
