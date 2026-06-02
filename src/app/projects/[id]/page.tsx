import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StatusBadge, PriorityBadge, ProgressBar } from "@/components/Badge";
import { formatDate } from "@/lib/report";
import { AddUpdateForm } from "@/components/AddUpdateForm";
import { addUpdateAction, deleteProjectAction } from "@/app/actions/projects";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireUser();

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      owner: true,
      updates: {
        include: { author: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!project) notFound();

  const addUpdate = addUpdateAction.bind(null, project.id);

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
        </div>
        <Link href={`/projects/${project.id}/edit`} className="btn-secondary">
          Edit
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: details + updates */}
        <div className="space-y-6 lg:col-span-2">
          {project.description ? (
            <div className="card p-5">
              <p className="whitespace-pre-wrap text-sm text-gray-700">
                {project.description}
              </p>
            </div>
          ) : null}

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
            <dl className="mt-4 space-y-3 text-sm">
              <Meta label="Owner" value={project.owner?.name ?? "Unassigned"} />
              <Meta label="Client" value={project.client.company || project.client.name} />
              <Meta label="Start" value={formatDate(project.startDate)} />
              <Meta label="Due" value={formatDate(project.dueDate)} />
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

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-right font-medium text-gray-800">{value}</dd>
    </div>
  );
}
