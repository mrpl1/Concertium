import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/Badge";
import { deliverableBadgeClass } from "@/lib/constants";
import { formatDate } from "@/lib/report";

export const dynamic = "force-dynamic";

type Item = {
  id: string;
  kind: "project" | "deliverable";
  name: string;
  client: string;
  projectId: string;
  status: string;
  due: number;
};

const DAY = 1000 * 60 * 60 * 24;

export default async function TimelinePage() {
  await requireUser();

  const projects = await prisma.project.findMany({
    where: { status: { not: "Completed" } },
    include: {
      client: true,
      deliverables: { where: { status: { not: "Approved" } } },
    },
  });

  const now = Date.now();
  const items: Item[] = [];
  for (const p of projects) {
    const client = p.client.company || p.client.name;
    if (p.dueDate) {
      items.push({
        id: `p-${p.id}`,
        kind: "project",
        name: p.name,
        client,
        projectId: p.id,
        status: p.status,
        due: p.dueDate.getTime(),
      });
    }
    for (const d of p.deliverables) {
      if (d.dueDate) {
        items.push({
          id: `d-${d.id}`,
          kind: "deliverable",
          name: `${d.name}  ·  ${p.name}`,
          client,
          projectId: p.id,
          status: d.status,
          due: d.dueDate.getTime(),
        });
      }
    }
  }
  items.sort((a, b) => a.due - b.due);

  const buckets: { label: string; test: (days: number) => boolean }[] = [
    { label: "Overdue", test: (d) => d < 0 },
    { label: "Next 7 days", test: (d) => d >= 0 && d <= 7 },
    { label: "8–30 days", test: (d) => d > 7 && d <= 30 },
    { label: "Beyond 30 days", test: (d) => d > 30 },
  ];

  const grouped = buckets.map((b) => ({
    label: b.label,
    items: items.filter((it) => b.test(Math.ceil((it.due - now) / DAY))),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Timeline</h1>
        <p className="text-sm text-gray-500">
          Upcoming project and deliverable deadlines across all clients.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="card p-10 text-center text-sm text-gray-500">
          No upcoming deadlines.
        </div>
      ) : (
        grouped.map((g) =>
          g.items.length === 0 ? null : (
            <section key={g.label} className="card overflow-hidden">
              <div
                className={`flex items-center justify-between border-b px-5 py-2.5 ${
                  g.label === "Overdue"
                    ? "border-red-100 bg-red-50"
                    : "border-gray-100"
                }`}
              >
                <h2
                  className={`text-sm font-semibold uppercase tracking-wide ${
                    g.label === "Overdue" ? "text-red-700" : "text-gray-500"
                  }`}
                >
                  {g.label}
                </h2>
                <span className="text-xs text-gray-400">{g.items.length}</span>
              </div>
              <ul className="divide-y divide-gray-100">
                {g.items.map((it) => {
                  const days = Math.ceil((it.due - now) / DAY);
                  return (
                    <li key={it.id}>
                      <Link
                        href={`/projects/${it.projectId}`}
                        className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50"
                      >
                        <div className="w-28 shrink-0">
                          <p className="text-sm font-medium text-gray-800">
                            {formatDate(new Date(it.due))}
                          </p>
                          <p className={`text-xs ${days < 0 ? "text-red-600" : "text-gray-400"}`}>
                            {days < 0 ? `${-days}d ago` : days === 0 ? "today" : `in ${days}d`}
                          </p>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-900">
                            {it.name}
                          </p>
                          <p className="truncate text-xs text-gray-500">
                            {it.client} ·{" "}
                            {it.kind === "deliverable" ? "Deliverable" : "Project"}
                          </p>
                        </div>
                        {it.kind === "deliverable" ? (
                          <span className={`badge ${deliverableBadgeClass(it.status)}`}>
                            {it.status}
                          </span>
                        ) : (
                          <StatusBadge status={it.status} />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )
        )
      )}
    </div>
  );
}
