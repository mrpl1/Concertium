import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { StatusBadge, ProgressBar } from "@/components/Badge";
import { deliverableBadgeClass } from "@/lib/constants";
import { formatDate } from "@/lib/report";
import { computeRisk } from "@/lib/risk";

export const dynamic = "force-dynamic";

export default async function SharedStatusPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const client = await prisma.client.findUnique({
    where: { shareToken: (await params).token },
    include: {
      projects: {
        include: {
          owner: true,
          deliverables: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] },
          updates: { orderBy: { createdAt: "desc" }, take: 1, include: { author: true } },
        },
        orderBy: [{ status: "asc" }, { dueDate: "asc" }],
      },
    },
  });

  if (!client) notFound();

  const active = client.projects.filter((p) => p.status !== "Completed");

  return (
    <div className="min-h-screen bg-[#141414]">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <header className="mb-8 flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-[6px] bg-brand-600 text-sm font-semibold text-white">
            C
          </span>
          <div>
            <h1 className="text-xl font-semibold text-[#ffffff]">
              {client.company || client.name} — Project Status
            </h1>
            <p className="text-sm text-[#ffffff]">
              As of {formatDate(new Date())} · {active.length} active project
              {active.length === 1 ? "" : "s"}
            </p>
          </div>
        </header>

        {client.projects.length === 0 ? (
          <div className="card p-10 text-center text-sm text-[#ffffff]">
            No projects to show yet.
          </div>
        ) : (
          <div className="space-y-5">
            {client.projects.map((p) => {
              const risk = computeRisk({
                status: p.status,
                progress: p.progress,
                dueDate: p.dueDate ? p.dueDate.getTime() : null,
                lastUpdateAt: p.updates[0]?.createdAt.getTime() ?? null,
                deliverables: p.deliverables.map((d) => ({
                  status: d.status,
                  dueDate: d.dueDate ? d.dueDate.getTime() : null,
                })),
              });
              return (
                <section key={p.id} className="card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-semibold text-[#ffffff]">
                        {p.name}
                      </h2>
                      {p.owner ? (
                        <p className="text-xs text-[#ffffff]">
                          Owner: {p.owner.name}
                        </p>
                      ) : null}
                    </div>
                    <StatusBadge status={p.status} />
                  </div>

                  {p.description ? (
                    <p className="mt-2 text-sm text-[#ffffff]">{p.description}</p>
                  ) : null}

                  <div className="mt-3 max-w-sm">
                    <ProgressBar value={p.progress} />
                  </div>
                  <p className="mt-1 text-xs text-[#ffffff]">
                    Due {formatDate(p.dueDate)}
                    {risk.totalDeliverables > 0
                      ? ` · ${risk.approved}/${risk.totalDeliverables} deliverables approved`
                      : ""}
                  </p>

                  {p.deliverables.length > 0 ? (
                    <ul className="mt-3 divide-y divide-[#000000] border-t border-[#000000]">
                      {p.deliverables.map((d) => {
                        const overdue =
                          d.status !== "Approved" &&
                          d.dueDate != null &&
                          d.dueDate.getTime() < Date.now();
                        return (
                          <li
                            key={d.id}
                            className="flex items-center justify-between gap-3 py-2 text-sm"
                          >
                            <span
                              className={
                                d.status === "Approved"
                                  ? "text-[#ffffff] line-through"
                                  : "text-[#ffffff]"
                              }
                            >
                              {d.name}
                            </span>
                            <span className="flex items-center gap-2">
                              <span className={overdue ? "text-xs font-medium text-[#0066cc]" : "text-xs text-[#ffffff]"}>
                                {formatDate(d.dueDate)}
                              </span>
                              <span className={`badge ${deliverableBadgeClass(d.status)}`}>
                                {d.status}
                              </span>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}

                  {p.updates[0] ? (
                    <div className="mt-3 rounded-[6px] bg-[#141414] p-3 text-sm text-[#ffffff] ring-1 ring-[#000000]">
                      <span className="font-medium text-[#ffffff]">Latest: </span>
                      {p.updates[0].body}
                    </div>
                  ) : null}
                </section>
              );
            })}
          </div>
        )}

        <p className="mt-8 text-center text-xs text-[#ffffff]">
          Read-only shared status
        </p>
      </div>
    </div>
  );
}
