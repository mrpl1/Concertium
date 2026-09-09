import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { clientScope, projectScope } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const user = await requireUser();

  const clients = await prisma.client.findMany({
    where: clientScope(user),
    orderBy: { name: "asc" },
    include: { projects: { where: projectScope(user), select: { id: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Clients</h1>
        <Link href="/clients/new" className="btn-primary">
          New client
        </Link>
      </div>

      {clients.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-gray-500">No clients yet.</p>
          <Link href="/clients/new" className="btn-primary mt-4">
            Add your first client
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((c) => (
            <Link
              key={c.id}
              href={`/clients/${c.id}`}
              className="card p-5 transition-shadow hover:shadow-md"
            >
              <p className="font-semibold text-gray-900">
                {c.company || c.name}
              </p>
              {c.company ? (
                <p className="text-sm text-gray-500">{c.name}</p>
              ) : null}
              {c.email ? (
                <p className="mt-2 truncate text-sm text-gray-500">{c.email}</p>
              ) : null}
              <p className="mt-3 text-xs font-medium text-brand-600">
                {c.projects.length} project
                {c.projects.length === 1 ? "" : "s"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
