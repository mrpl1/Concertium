import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { clientScope, projectScope } from "@/lib/access";
import { PROJECT_STATUSES, statusHex } from "@/lib/constants";
import { computeRisk, slippageDays } from "@/lib/risk";
import { averageProgress } from "@/lib/lifecycle";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const user = await requireUser();

  const [projects, clients] = await Promise.all([
    prisma.project.findMany({
      where: projectScope(user),
      include: {
        client: true,
        deliverables: true,
        updates: { select: { createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    prisma.client.findMany({ where: clientScope(user) }),
  ]);

  const now = Date.now();

  // ---- Delivery performance ----
  const approvedWithDue = projects
    .flatMap((p) => p.deliverables)
    .filter((d) => d.status === "Approved" && d.approvedAt && d.dueDate);
  const onTime = approvedWithDue.filter(
    (d) => d.approvedAt!.getTime() <= d.dueDate!.getTime() + 1000 * 60 * 60 * 24
  ).length;
  const onTimeRate =
    approvedWithDue.length > 0
      ? Math.round((onTime / approvedWithDue.length) * 100)
      : null;

  // ---- Slippage ----
  const slips = projects
    .map((p) =>
      slippageDays(
        p.baselineDueDate ? p.baselineDueDate.getTime() : null,
        p.dueDate ? p.dueDate.getTime() : null
      )
    )
    .filter((d) => d > 0);
  const avgSlip = slips.length
    ? Math.round(slips.reduce((a, b) => a + b, 0) / slips.length)
    : 0;

  // ---- Risk rollups ----
  const riskById = new Map(
    projects.map((p) => [
      p.id,
      computeRisk(
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
      ),
    ])
  );
  const overdue = [...riskById.values()].filter((r) => r.level === "overdue").length;
  const completed = projects.filter((p) => p.status === "Completed").length;

  // ---- Status distribution ----
  const dist: Record<string, number> = {};
  for (const s of PROJECT_STATUSES) dist[s] = 0;
  for (const p of projects) dist[p.status] = (dist[p.status] || 0) + 1;
  const maxDist = Math.max(1, ...Object.values(dist));

  // ---- Per-client table ----
  const rows = clients
    .map((c) => {
      const cps = projects.filter((p) => p.clientId === c.id);
      const cOverdue = cps.filter(
        (p) => riskById.get(p.id)?.level === "overdue"
      ).length;
      return {
        id: c.id,
        name: c.company || c.name,
        count: cps.length,
        avg: averageProgress(cps),
        overdue: cOverdue,
      };
    })
    .filter((r) => r.count > 0)
    .sort((a, b) => b.overdue - a.overdue || b.count - a.count);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500">Delivery performance across all clients.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Metric
          label="On-time delivery"
          value={onTimeRate == null ? "—" : `${onTimeRate}%`}
          hint={onTimeRate == null ? "No approved deliverables yet" : `${onTime}/${approvedWithDue.length} deliverables`}
        />
        <Metric label="Avg. slippage" value={`${avgSlip}d`} hint={`${slips.length} project(s) slipped`} />
        <Metric label="Overdue projects" value={overdue} warn={overdue > 0} />
        <Metric label="Completed" value={completed} hint={`of ${projects.length} total`} />
      </div>

      <section className="card p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Projects by status
        </h2>
        <div className="space-y-2">
          {PROJECT_STATUSES.map((s) => (
            <div key={s} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-sm text-gray-600">{s}</span>
              <div className="h-5 flex-1 rounded bg-gray-100">
                <div
                  className="h-5 rounded"
                  style={{ width: `${(dist[s] / maxDist) * 100}%`, background: statusHex(s), minWidth: dist[s] ? 6 : 0 }}
                />
              </div>
              <span className="w-8 text-right text-sm tabular-nums text-gray-500">{dist[s]}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Client health
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
              <th className="px-5 py-2 font-medium">Client</th>
              <th className="px-5 py-2 font-medium">Projects</th>
              <th className="px-5 py-2 font-medium">Avg. progress</th>
              <th className="px-5 py-2 font-medium">Overdue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-5 py-2.5">
                  <Link href={`/clients/${r.id}`} className="font-medium text-brand-700">
                    {r.name}
                  </Link>
                </td>
                <td className="px-5 py-2.5 text-gray-600">{r.count}</td>
                <td className="px-5 py-2.5 text-gray-600">{r.avg}%</td>
                <td className="px-5 py-2.5">
                  {r.overdue > 0 ? (
                    <span className="badge bg-red-100 text-red-800 ring-red-300">{r.overdue}</span>
                  ) : (
                    <span className="text-gray-400">0</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  warn,
}: {
  label: string;
  value: string | number;
  hint?: string;
  warn?: boolean;
}) {
  return (
    <div className={`card p-4 ${warn ? "ring-2 ring-amber-300" : ""}`}>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-gray-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-gray-400">{hint}</p> : null}
    </div>
  );
}
