import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PROJECT_STATUSES } from "@/lib/constants";
import { StatusBadge, PriorityBadge, ProgressBar } from "@/components/Badge";
import { formatDate } from "@/lib/report";

export const dynamic = "force-dynamic";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: { status?: string; clientId?: string };
}) {
  await requireUser();

  const statusFilter = searchParams.status;
  const clientFilter = searchParams.clientId;

  const where: { status?: string; clientId?: string } = {};
  if (statusFilter && (PROJECT_STATUSES as readonly string[]).includes(statusFilter)) {
    where.status = statusFilter;
  }
  if (clientFilter) where.clientId = clientFilter;

  const [projects, clients] = await Promise.all([
    prisma.project.findMany({
      where,
      include: { client: true, owner: true },
      orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
    }),
    prisma.client.findMany({ orderBy: { name: "asc" } }),
  ]);

  const activeClient = clientFilter
    ? clients.find((c) => c.id === clientFilter)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Projects</h1>
        <Link href="/projects/new" className="btn-primary">
          New project
        </Link>
      </div>

      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2">
        <FilterChip
          label="All"
          href={buildHref({ clientId: clientFilter })}
          active={!statusFilter}
        />
        {PROJECT_STATUSES.map((s) => (
          <FilterChip
            key={s}
            label={s}
            href={buildHref({ status: s, clientId: clientFilter })}
            active={statusFilter === s}
          />
        ))}
      </div>

      {activeClient ? (
        <p className="text-sm text-gray-500">
          Filtered to{" "}
          <span className="font-medium text-gray-700">
            {activeClient.company || activeClient.name}
          </span>{" "}
          ·{" "}
          <Link
            href={buildHref({ status: statusFilter })}
            className="text-brand-600"
          >
            clear
          </Link>
        </p>
      ) : null}

      {projects.length === 0 ? (
        <div className="card p-10 text-center text-sm text-gray-500">
          No projects match this view.
        </div>
      ) : (
        <div className="card divide-y divide-gray-100">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="flex flex-wrap items-center gap-4 px-5 py-4 hover:bg-gray-50"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium text-gray-900">
                    {p.name}
                  </p>
                  <PriorityBadge priority={p.priority} />
                </div>
                <p className="truncate text-xs text-gray-500">
                  {p.client.company || p.client.name}
                  {p.owner ? ` · ${p.owner.name}` : ""} · Due{" "}
                  {formatDate(p.dueDate)}
                </p>
              </div>
              <div className="w-40">
                <ProgressBar value={p.progress} />
              </div>
              <StatusBadge status={p.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function buildHref(params: { status?: string; clientId?: string }): string {
  const sp = new URLSearchParams();
  if (params.status) sp.set("status", params.status);
  if (params.clientId) sp.set("clientId", params.clientId);
  const qs = sp.toString();
  return qs ? `/projects?${qs}` : "/projects";
}

function FilterChip({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1 text-sm font-medium ring-1 ring-inset ${
        active
          ? "bg-brand-600 text-white ring-brand-600"
          : "bg-white text-gray-600 ring-gray-300 hover:bg-gray-50"
      }`}
    >
      {label}
    </Link>
  );
}
