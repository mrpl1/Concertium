import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PROJECT_STATUSES, statusBadgeClass } from "@/lib/constants";
import { StatusBadge, ProgressBar } from "@/components/Badge";
import { formatDate } from "@/lib/report";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();

  const [clientCount, projects] = await Promise.all([
    prisma.client.count(),
    prisma.project.findMany({
      include: { client: true, owner: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const counts: Record<string, number> = {};
  for (const s of PROJECT_STATUSES) counts[s] = 0;
  for (const p of projects) counts[p.status] = (counts[p.status] || 0) + 1;

  const active = projects.filter((p) => p.status !== "Completed");
  const needsAttention = projects.filter(
    (p) => p.status === "At Risk" || p.status === "Off Track"
  );

  const now = Date.now();
  const upcoming = projects
    .filter(
      (p) =>
        p.dueDate &&
        p.status !== "Completed" &&
        new Date(p.dueDate).getTime() >= now - 1000 * 60 * 60 * 24
    )
    .sort(
      (a, b) =>
        new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()
    )
    .slice(0, 6);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">
            Welcome back, {user.name.split(" ")[0]}.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/projects/new" className="btn-primary">
            New project
          </Link>
          <Link href="/reports" className="btn-secondary">
            Status report
          </Link>
        </div>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Clients" value={clientCount} href="/clients" />
        <Stat label="Active projects" value={active.length} href="/projects" />
        <Stat
          label="Need attention"
          value={needsAttention.length}
          href="/projects?status=At+Risk"
          tone={needsAttention.length > 0 ? "warn" : "default"}
        />
        <Stat label="Completed" value={counts["Completed"]} href="/projects?status=Completed" />
      </div>

      {/* Status breakdown */}
      <section className="card p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Project status
        </h2>
        <div className="flex flex-wrap gap-3">
          {PROJECT_STATUSES.map((s) => (
            <Link
              key={s}
              href={`/projects?status=${encodeURIComponent(s)}`}
              className={`badge ${statusBadgeClass(s)} gap-2`}
            >
              {s}
              <span className="font-semibold">{counts[s]}</span>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Needs attention */}
        <section className="card p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Needs attention
          </h2>
          {needsAttention.length === 0 ? (
            <p className="text-sm text-gray-500">
              Nothing at risk or off track. 🎉
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {needsAttention.map((p) => (
                <li key={p.id} className="py-3">
                  <Link
                    href={`/projects/${p.id}`}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-900">
                        {p.name}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {p.client.company || p.client.name}
                      </p>
                    </div>
                    <StatusBadge status={p.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Upcoming deadlines */}
        <section className="card p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Upcoming deadlines
          </h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-gray-500">No upcoming due dates.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {upcoming.map((p) => (
                <li key={p.id} className="py-3">
                  <Link
                    href={`/projects/${p.id}`}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-900">
                        {p.name}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {p.client.company || p.client.name}
                      </p>
                    </div>
                    <span className="whitespace-nowrap text-sm text-gray-600">
                      {formatDate(p.dueDate)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Recent projects */}
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Recently updated
          </h2>
          <Link href="/projects" className="text-sm font-medium text-brand-600">
            View all
          </Link>
        </div>
        {projects.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No projects yet.{" "}
            <Link href="/projects/new" className="font-medium text-brand-600">
              Create your first project
            </Link>
            .
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {projects.slice(0, 6).map((p) => (
              <li key={p.id}>
                <Link
                  href={`/projects/${p.id}`}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-gray-900">
                      {p.name}
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      {p.client.company || p.client.name}
                    </p>
                  </div>
                  <div className="hidden w-40 sm:block">
                    <ProgressBar value={p.progress} />
                  </div>
                  <StatusBadge status={p.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  href,
  tone = "default",
}: {
  label: string;
  value: number;
  href: string;
  tone?: "default" | "warn";
}) {
  return (
    <Link
      href={href}
      className={`card p-4 transition-shadow hover:shadow-md ${
        tone === "warn" && value > 0 ? "ring-2 ring-amber-300" : ""
      }`}
    >
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-gray-900">{value}</p>
    </Link>
  );
}
