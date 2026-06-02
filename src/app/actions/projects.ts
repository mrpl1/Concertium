"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PROJECT_STATUSES, PRIORITIES } from "@/lib/constants";

export type ProjectActionState = { error?: string } | undefined;

function parseDate(value: FormDataEntryValue | null): Date | null {
  const s = String(value || "").trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function readProjectForm(formData: FormData) {
  const status = String(formData.get("status") || "Not Started");
  const priority = String(formData.get("priority") || "Medium");
  let progress = Number(formData.get("progress") || 0);
  if (Number.isNaN(progress)) progress = 0;
  progress = Math.max(0, Math.min(100, Math.round(progress)));

  return {
    name: String(formData.get("name") || "").trim(),
    description: String(formData.get("description") || "").trim() || null,
    status: (PROJECT_STATUSES as readonly string[]).includes(status)
      ? status
      : "Not Started",
    priority: (PRIORITIES as readonly string[]).includes(priority)
      ? priority
      : "Medium",
    progress,
    startDate: parseDate(formData.get("startDate")),
    dueDate: parseDate(formData.get("dueDate")),
    clientId: String(formData.get("clientId") || ""),
    ownerId: String(formData.get("ownerId") || "") || null,
  };
}

export async function createProjectAction(
  _prev: ProjectActionState,
  formData: FormData
): Promise<ProjectActionState> {
  await requireUser();
  const data = readProjectForm(formData);
  if (!data.name) return { error: "Project name is required." };
  if (!data.clientId) return { error: "Please choose a client." };

  const project = await prisma.project.create({ data });
  revalidatePath("/projects");
  revalidatePath("/");
  revalidatePath(`/clients/${data.clientId}`);
  redirect(`/projects/${project.id}`);
}

export async function updateProjectAction(
  id: string,
  _prev: ProjectActionState,
  formData: FormData
): Promise<ProjectActionState> {
  await requireUser();
  const data = readProjectForm(formData);
  if (!data.name) return { error: "Project name is required." };
  if (!data.clientId) return { error: "Please choose a client." };

  await prisma.project.update({ where: { id }, data });
  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  revalidatePath("/");
  revalidatePath(`/clients/${data.clientId}`);
  redirect(`/projects/${id}`);
}

export async function deleteProjectAction(formData: FormData): Promise<void> {
  await requireUser();
  const id = String(formData.get("id") || "");
  let clientId = "";
  if (id) {
    const project = await prisma.project.findUnique({ where: { id } });
    clientId = project?.clientId || "";
    await prisma.project.delete({ where: { id } });
  }
  revalidatePath("/projects");
  revalidatePath("/");
  if (clientId) revalidatePath(`/clients/${clientId}`);
  redirect("/projects");
}

export async function addUpdateAction(
  projectId: string,
  _prev: ProjectActionState,
  formData: FormData
): Promise<ProjectActionState> {
  const user = await requireUser();
  const body = String(formData.get("body") || "").trim();
  const newStatus = String(formData.get("status") || "").trim();
  if (!body) return { error: "Update note cannot be empty." };

  await prisma.statusUpdate.create({
    data: {
      projectId,
      authorId: user.id,
      body,
      status: newStatus || null,
    },
  });

  // If the update carries a new status, apply it to the project too.
  if (newStatus && (PROJECT_STATUSES as readonly string[]).includes(newStatus)) {
    await prisma.project.update({
      where: { id: projectId },
      data: { status: newStatus },
    });
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");
  return undefined;
}
