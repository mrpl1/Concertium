import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SettingsForm } from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireAdmin();

  const workspace = await prisma.workspace.findUnique({
    where: { id: user.workspaceId },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Workspace settings
        </h1>
        <p className="text-base text-gray-500 leading-relaxed">
          {workspace?.name ?? "Your workspace"} — Slack alerts and weekly
          reports.
        </p>
      </div>

      <div className="card rounded-md border-0 bg-white p-8 shadow-xl shadow-black/5">
        <SettingsForm
          slackWebhookUrl={workspace?.slackWebhookUrl ?? ""}
          weeklyReportEnabled={workspace?.weeklyReportEnabled ?? false}
        />
      </div>
    </div>
  );
}
