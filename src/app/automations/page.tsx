import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { clientScope } from "@/lib/access";
import { isEmailConfigured } from "@/lib/email";
import { isSlackConfigured } from "@/lib/slack";
import { buildAlertDigest } from "@/lib/automations";
import { AutomationsPanel } from "./AutomationsPanel";

export const dynamic = "force-dynamic";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function AutomationsPage() {
  const user = await requireAdmin();

  const [digest, weeklyClients, workspace] = await Promise.all([
    buildAlertDigest(user.workspaceId),
    prisma.client.findMany({
      where: { weeklyReport: true, ...clientScope(user) },
      orderBy: { name: "asc" },
    }),
    prisma.workspace.findUnique({ where: { id: user.workspaceId } }),
  ]);

  const emailOn = isEmailConfigured();
  const slackOn = isSlackConfigured(workspace?.slackWebhookUrl);
  const cronOn = Boolean(process.env.CRON_SECRET);
  const weeklyDay = DAYS[Number(process.env.WEEKLY_REPORT_DAY ?? 5)] ?? "Friday";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Automations</h1>
        <p className="text-sm text-gray-500">
          Proactive deadline alerts and scheduled client reports.
        </p>
      </div>

      {/* Config status */}
      <section className="card p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Configuration
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Status on={emailOn} label="Email (SMTP)" hint="SMTP_* in .env" />
          <Status on={slackOn} label="Slack" hint="set the webhook in Settings" />
          <Status on={cronOn} label="Scheduler endpoint" hint="CRON_SECRET in .env" />
          <Status on label={`Weekly reports: ${weeklyDay}`} hint="WEEKLY_REPORT_DAY in .env" />
        </div>
        {cronOn ? (
          <p className="mt-4 rounded-md bg-gray-50 p-3 text-xs text-gray-600 ring-1 ring-gray-200">
            Point a daily scheduler at{" "}
            <code className="font-mono">/api/cron?secret=YOUR_CRON_SECRET</code>.
            It sends the alert digest daily and weekly reports on {weeklyDay}.
          </p>
        ) : (
          <p className="mt-4 text-xs text-gray-500">
            Set <code className="font-mono">CRON_SECRET</code> in <code>.env</code> to enable the
            scheduled endpoint. You can still run everything manually below.
          </p>
        )}
      </section>

      {/* Manual triggers */}
      <AutomationsPanel />

      {/* Weekly opt-ins */}
      <section className="card p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Clients receiving weekly reports ({weeklyClients.length})
        </h2>
        {weeklyClients.length === 0 ? (
          <p className="text-sm text-gray-500">
            None yet. Open a client, choose Edit, and enable “Weekly report”.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {weeklyClients.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                <Link href={`/clients/${c.id}`} className="font-medium text-brand-700">
                  {c.company || c.name}
                </Link>
                <span className="text-gray-500">{c.email || "no email set"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Digest preview */}
      <section className="card p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Current alert digest preview
        </h2>
        <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm text-gray-700 ring-1 ring-gray-200">
          {digest.text}
        </pre>
      </section>
    </div>
  );
}

function Status({ on, label, hint }: { on: boolean; label: string; hint: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`h-2.5 w-2.5 rounded-full ${on ? "bg-green-500" : "bg-gray-300"}`}
      />
      <span className="text-sm text-gray-800">{label}</span>
      <span className="text-xs text-gray-400">· {on ? "enabled" : hint}</span>
    </div>
  );
}
