import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/Badge";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  const q = ((await searchParams).q || "").trim();

  const [clients, projects] = q
    ? await Promise.all([
        prisma.client.findMany({
          where: {
            workspaceId: user.workspaceId,
            OR: [
              { name: { contains: q } },
              { company: { contains: q } },
              { email: { contains: q } },
            ],
          },
          orderBy: { name: "asc" },
          take: 25,
        }),
        prisma.project.findMany({
          where: {
            workspaceId: user.workspaceId,
            OR: [
              { name: { contains: q } },
              { description: { contains: q } },
              { tags: { some: { name: { contains: q } } } },
            ],
          },
          include: { client: true },
          orderBy: { updatedAt: "desc" },
          take: 25,
        }),
      ])
    : [[], []];

  const empty = q && clients.length === 0 && projects.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#ffffff]">Search</h1>
        {q ? (
          <p className="text-sm text-[#ffffff]">
            Results for “{q}” — {clients.length} client(s), {projects.length}{" "}
            project(s)
          </p>
        ) : (
          <p className="text-sm text-[#ffffff]">
            Type a query in the search box to find clients and projects.
          </p>
        )}
      </div>

      {empty ? (
        <div className="card p-10 text-center text-sm text-[#ffffff]">
          No matches for “{q}”.
        </div>
      ) : null}

      {projects.length > 0 ? (
        <section className="card overflow-hidden">
          <div className="border-b border-[#000000] px-5 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[#ffffff]">
              Projects
            </h2>
          </div>
          <ul className="divide-y divide-[#000000]">
            {projects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/projects/${p.id}`}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-[#141414]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-[#ffffff]">{p.name}</p>
                    <p className="truncate text-xs text-[#ffffff]">
                      {p.client.company || p.client.name}
                    </p>
                  </div>
                  <StatusBadge status={p.status} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {clients.length > 0 ? (
        <section className="card overflow-hidden">
          <div className="border-b border-[#000000] px-5 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[#ffffff]">
              Clients
            </h2>
          </div>
          <ul className="divide-y divide-[#000000]">
            {clients.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/clients/${c.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-[#141414]"
                >
                  <span className="font-medium text-[#ffffff]">
                    {c.company || c.name}
                  </span>
                  <span className="text-sm text-[#ffffff]">{c.email}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
