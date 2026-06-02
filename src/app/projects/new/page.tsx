import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ProjectForm } from "@/components/ProjectForm";
import { createProjectAction } from "@/app/actions/projects";

export const dynamic = "force-dynamic";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: { clientId?: string };
}) {
  const user = await requireUser();

  const [clients, users] = await Promise.all([
    prisma.client.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (clients.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="card p-10 text-center">
          <p className="text-gray-600">
            You need a client before creating a project.
          </p>
          <Link href="/clients/new" className="btn-primary mt-4">
            Add a client first
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/projects" className="text-sm text-brand-600">
          ← Projects
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-gray-900">
          New project
        </h1>
      </div>
      <div className="card p-6">
        <ProjectForm
          action={createProjectAction}
          clients={clients}
          users={users}
          defaults={{
            clientId: searchParams.clientId,
            ownerId: user.id,
          }}
          submitLabel="Create project"
          cancelHref="/projects"
        />
      </div>
    </div>
  );
}
