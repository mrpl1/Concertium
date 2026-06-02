import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StatusBadge, PriorityBadge, ProgressBar } from "@/components/Badge";
import { formatDate } from "@/lib/report";
import { deleteClientAction } from "@/app/actions/clients";
import { ShareLink } from "@/components/ShareLink";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireUser();

  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: {
      projects: {
        include: { owner: true },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  if (!client) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/clients" className="text-sm text-brand-600">
            ← Clients
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-gray-900">
            {client.company || client.name}
          </h1>
          {client.company ? (
            <p className="text-gray-500">{client.name}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/reports?clientId=${client.id}`}
            className="btn-secondary"
          >
            Status report
          </Link>
          <Link href={`/clients/${client.id}/edit`} className="btn-secondary">
            Edit
          </Link>
          <Link
            href={`/projects/new?clientId=${client.id}`}
            className="btn-primary"
          >
            New project
          </Link>
        </div>
      </div>

      {/* Contact details */}
      <div className="card grid gap-4 p-5 sm:grid-cols-3">
        <Detail label="Email" value={client.email} isEmail />
        <Detail label="Phone" value={client.phone} />
        <Detail label="Added" value={formatDate(client.createdAt)} />
        {client.notes ? (
          <div className="sm:col-span-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Notes
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
              {client.notes}
            </p>
          </div>
        ) : null}
      </div>

      {/* Projects */}
      <section className="card overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Projects ({client.projects.length})
          </h2>
        </div>
        {client.projects.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No projects for this client yet.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {client.projects.map((p) => (
              <li key={p.id}>
                <Link
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
                    <p className="text-xs text-gray-500">
                      {p.owner ? `Owner: ${p.owner.name} · ` : ""}
                      Due {formatDate(p.dueDate)}
                    </p>
                  </div>
                  <div className="w-40">
                    <ProgressBar value={p.progress} />
                  </div>
                  <StatusBadge status={p.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Share link */}
      <ShareLink clientId={client.id} token={client.shareToken} />

      {/* Danger zone */}
      <form action={deleteClientAction} className="pt-2">
        <input type="hidden" name="id" value={client.id} />
        <button type="submit" className="btn-danger">
          Delete client
        </button>
        <span className="ml-2 text-xs text-gray-400">
          This also deletes its projects and updates.
        </span>
      </form>
    </div>
  );
}

function Detail({
  label,
  value,
  isEmail,
}: {
  label: string;
  value: string | null;
  isEmail?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
        {label}
      </p>
      {value ? (
        isEmail ? (
          <a
            href={`mailto:${value}`}
            className="mt-1 block truncate text-sm text-brand-600"
          >
            {value}
          </a>
        ) : (
          <p className="mt-1 text-sm text-gray-700">{value}</p>
        )
      ) : (
        <p className="mt-1 text-sm text-gray-400">—</p>
      )}
    </div>
  );
}
