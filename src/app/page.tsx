import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  DashboardClient,
  type DashClient,
  type DashProject,
} from "@/components/DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();

  const [clients, projects] = await Promise.all([
    prisma.client.findMany({ orderBy: { name: "asc" } }),
    prisma.project.findMany({
      include: { client: true, owner: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  // Serialize to plain, client-safe data (no Date objects).
  const dashClients: DashClient[] = clients.map((c) => ({
    id: c.id,
    name: c.name,
    company: c.company,
  }));

  const dashProjects: DashProject[] = projects.map((p) => ({
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
  }));

  return (
    <DashboardClient
      firstName={user.name.split(" ")[0]}
      clients={dashClients}
      projects={dashProjects}
    />
  );
}
