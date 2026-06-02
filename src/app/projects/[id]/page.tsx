import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StatusBadge, PriorityBadge, ProgressBar } from "@/components/Badge";
import { formatDate } from "@/lib/report";
import { AddUpdateForm } from "@/components/AddUpdateForm";
import { Deliverables, type DeliverableItem } from "@/components/Deliverables";
import { ProjectResources } from "@/components/ProjectResources";
import { TimeTracking } from "@/components/TimeTracking";
import { addUpdateAction, deleteProjectAction } from "@/app/actions/projects";
import {
  computeRisk,
  slippageDays,
  RISK_STYLES,
  RISK_LABELS,
} from "@/lib/risk";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();

  const [project, users] = await Promise.all([
    prisma.project.findUnique({
      where: { id: (await params).id },
      include: {
        client: true,
        owner: true,
        updates: {
          include: { author: true },
          orderBy: { createdAt: "desc" },
        },
        deliverables: {
          include: { owner: true, _count: { select: { deadlineChanges: true } } },
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        },
        links: { orderBy: { createdAt: "asc" } },
        tags: true,
        timeEntries: {
          include: { user: true },
          orderBy: { date: "desc" },
        },
      },
    }),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!project) notFound();

  const addUpdate = addUpdateAction.bind(null, project.id);

  const deliverableItems: DeliverableItem[] = project.deliverables.map((d) => ({
    id: d.id,
    name: d.name,
    description: d.description,
    status: d.status,
    ownerId: d.ownerId,
    ownerName: d.owner?.name ?? null,
    dueDate: d.dueDate ? d.dueDate.getTime() : null,
    baselineDueDate: d.baselineDueDate ? d.baselineDueDate.getTime() : null,
    changeCount: d._count.deadlineChanges,
  }));

  const risk = computeRisk({
    status: project.status,
    progress: project.progress,
    dueDate: project.dueDate ? project.dueDate.getTime() : null,
    lastUpdateAt: project.updates[0]?.createdAt.getTime() ?? null,
    deliverables: deliverableItems.map((d) => ({
      status: d.status,
      dueDate: d.dueDate,
    })),
  });

  const slip = slippageDays(
    project.baselineDueDate ? project.baselineDueDate.getTime() : null,
    project.dueDate ? project.dueDate.getTime() : null
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href={`/clients/${project.clientId}`}
            className="text-sm text-brand-600"
          >
            ← {project.client.company || project.client.name}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-gray-900">
              {project.name}
            </h1>
            <StatusBadge status={project.status} />
            <PriorityBadge priority={project.priority} />
          </div>
          {project.tags.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {project.tags.map((t) => (
                <Link
                  key={t.id}
                  href={`/projects?tag=${encodeURIComponent(t.name)}`}
                  className="badge bg-gray-100 text-gray-600 ring-gray-300 hover:bg-gray-200"
                >
                  {`#${t.name}`}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
        <Link href={`/projects/${project.id}/edit`} className="btn-secondary">
          Edit
        </Link>
      </div>

      {/* Risk banner */}
      {risk.level !== "none" ? (
        <div className={`rounded-lg p-4 ring-1 ring-inset ${RISK_STYLES[risk.level]}`}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">
              {RISK_LABELS[risk.level]}
            </span>
            <span className="text-sm">— {risk.reasons.join(" · ")}</span>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: details + deliverables + updates */}
        <div className="space-y-6 lg:col-span-2">
          {project.description ? (
            <div className="card p-5">
              <p className="whitespace-pre-wrap text-sm text-gray-700">
                {project.description}
              </p>
            </div>
          ) : null}

          <Deliverables
            projectId={project.id}
            deliverables={deliverableItems}
            users={users}
          />

          <ProjectResources
            projectId={project.id}
            links={project.links.map((l) => ({ id: l.id, label: l.label, url: l.url }))}
          />

          <TimeTracking
            projectId={project.id}
            budgetHours={project.budgetHours}
            entries={project.timeEntries.map((e) => ({
              id: e.id,
              hours: e.hours,
              note: e.note,
              date: e.date.getTime(),
              userName: e.user?.name ?? null,
            }))}
          />

          <section className="card p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Post an update
            </h2>
            <AddUpdateForm action={addUpdate} currentStatus={project.status} />
          </section>

          <section className="card p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Update history
            </h2>
            {project.updates.length === 0 ? (
              <p className="text-sm text-gray-500">No updates yet.</p>
            ) : (
              <ol className="space-y-4">
                {project.updates.map((u) => (
                  <li key={u.id} className="border-l-2 border-gray-200 pl-4">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span className="font-medium text-gray-700">
                        {u.author?.name ?? "Unknown"}
                      </span>
                      <span>·</span>
                      <span>{formatDate(u.createdAt)}</span>
                      {u.status ? <StatusBadge status={u.status} /> : null}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
                      {u.body}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        {/* Right: meta */}
        <aside className="space-y-4">
          <div className="card p-5">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
              Progress
            </p>
            <ProgressBar value={project.progress} />
            {risk.deliverableCompletion != null ? (
              <p className="mt-2 text-xs text-gray-500">
                Deliverables: {risk.approved}/{risk.totalDeliverables} approved (
                {risk.deliverableCompletion}%)
              </p>
            ) : null}
            <dl className="mt-4 space-y-3 text-sm">
              <Meta label="Owner" value={project.owner?.name ?? "Unassigned"} />
              <Meta label="Client" value={project.client.company || project.client.name} />
              <Meta label="Start" value={formatDate(project.startDate)} />
              <Meta label="Due" value={formatDate(project.dueDate)} />
              {slip > 0 ? (
                <Meta
                  label="Deadline"
                  value={`Slipped ${slip}d from ${formatDate(project.baselineDueDate)}`}
                  warn
                />
              ) : null}
              <Meta label="Created" value={formatDate(project.createdAt)} />
            </dl>
          </div>

          <form action={deleteProjectAction}>
            <input type="hidden" name="id" value={project.id} />
            <button type="submit" className="btn-danger w-full">
              Delete project
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}

function Meta({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-gray-500">{label}</dt>
      <dd
        className={`text-right font-medium ${warn ? "text-amber-600" : "text-gray-800"}`}
      >
        {value}
      </dd>
    </div>
  );
}
