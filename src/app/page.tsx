import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { clientScope, projectScope } from "@/lib/access";
import { computeRisk } from "@/lib/risk";
import {
  DashboardClient,
  type DashClient,
  type DashProject,
} from "@/components/DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();

  const [clients, projects] = await Promise.all([
    prisma.client.findMany({
      where: clientScope(user),
      orderBy: { name: "asc" },
    }),
    prisma.project.findMany({
      where: projectScope(user),
      include: {
        client: true,
        owner: true,
        deliverables: { select: { status: true, dueDate: true } },
        updates: { select: { createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  // Serialize to plain, client-safe data (no Date objects).
  const dashClients: DashClient[] = clients.map((c) => ({
    id: c.id,
    name: c.name,
    company: c.company,
  }));

  const dashProjects: DashProject[] = projects.map((p) => {
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
    return {
      id: p.id,
      name: p.name,
      status: p.status,
      priority: p.priority,
      progress: p.progress,
      dueDate: p.dueDate ? p.dueDate.getTime() : null,
      updatedAt: p.updatedAt.getTime(),
      clientId: p.clientId,
      clientName: p.client.company || p.client.name,
      ownerName: p.owner?.name ?? null,
      riskLevel: risk.level,
      riskReasons: risk.reasons,
      overdueDeliverables: risk.overdueDeliverables,
    };
  });

  return (
    <DashboardClient
      firstName={user.name.split(" ")[0]}
      clients={dashClients}
      projects={dashProjects}
    />
  );
}
