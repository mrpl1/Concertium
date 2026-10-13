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
  const user = await requireUser();

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
    prisma.user.findMany({
      where: { workspaceId: user.workspaceId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!project || project.workspaceId !== user.workspaceId) notFound();

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
            <h1 className="text-2xl font-semibold text-[#ffffff]">
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
                  className="badge bg-[#141414] text-[#ffffff] ring-[#000000] hover:bg-[#141414]"
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
        <div className={`rounded-[6px] p-4 ring-1 ring-inset ${RISK_STYLES[risk.level]}`}>
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
              <p className="whitespace-pre-wrap text-sm text-[#ffffff]">
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
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#ffffff]">
              Post an update
            </h2>
            <AddUpdateForm action={addUpdate} currentStatus={project.status} />
          </section>

          <section className="card p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#ffffff]">
              Update history
            </h2>
            {project.updates.length === 0 ? (
              <p className="text-sm text-[#ffffff]">No updates yet.</p>
            ) : (
              <ol className="space-y-4">
                {project.updates.map((u) => (
                  <li key={u.id} className="border-l-2 border-[#000000] pl-4">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#ffffff]">
                      <span className="font-medium text-[#ffffff]">
                        {u.author?.name ?? "Unknown"}
                      </span>
                      <span>·</span>
                      <span>{formatDate(u.createdAt)}</span>
                      {u.status ? <StatusBadge status={u.status} /> : null}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-[#ffffff]">
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
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#ffffff]">
              Progress
            </p>
            <ProgressBar value={project.progress} />
            {risk.deliverableCompletion != null ? (
              <p className="mt-2 text-xs text-[#ffffff]">
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
      <dt className="text-[#ffffff]">{label}</dt>
      <dd
        className={`text-right font-medium ${warn ? "text-[#0066cc]" : "text-[#ffffff]"}`}
      >
        {value}
      </dd>
    </div>
  );
}
