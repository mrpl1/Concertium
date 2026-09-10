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
    <div className="mx-auto max-w-5xl space-y-10 px-8 py-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#ffffff]">
          Workspace settings
        </h1>
        <p className="text-base text-[#ffffff] leading-relaxed">
          {workspace?.name ?? "Your workspace"} — Slack alerts and weekly
          reports.
        </p>
      </div>

      <div className="card rounded-[6px] border-0 bg-white p-8 shadow-xl shadow-black/5">
        <SettingsForm
          slackWebhookUrl={workspace?.slackWebhookUrl ?? ""}
          weeklyReportEnabled={workspace?.weeklyReportEnabled ?? false}
        />
      </div>
    </div>
  );
}
