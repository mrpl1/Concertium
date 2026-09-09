import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ProjectForm } from "@/components/ProjectForm";
import { updateProjectAction } from "@/app/actions/projects";

export const dynamic = "force-dynamic";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();

  const [project, clients, users] = await Promise.all([
    prisma.project.findUnique({
      where: { id: (await params).id },
      include: { tags: true },
    }),
    prisma.client.findMany({
      where: { workspaceId: user.workspaceId },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { workspaceId: user.workspaceId },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!project || project.workspaceId !== user.workspaceId) notFound();

  const action = updateProjectAction.bind(null, project.id);
  const tagsDefault = project.tags.map((t) => t.name).join(", ");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href={`/projects/${project.id}`} className="text-sm text-brand-600">
          ← {project.name}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-gray-900">
          Edit project
        </h1>
      </div>
      <div className="card p-6">
        <ProjectForm
          action={action}
          clients={clients}
          users={users}
          defaults={project}
          tagsDefault={tagsDefault}
          submitLabel="Save changes"
          cancelHref={`/projects/${project.id}`}
        />
      </div>
    </div>
  );
}
