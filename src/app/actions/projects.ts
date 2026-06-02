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

// Parse a comma-separated tags field into a unique, trimmed list.
function parseTags(formData: FormData): string[] {
  const raw = String(formData.get("tags") || "");
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of raw.split(",").map((s) => s.trim()).filter(Boolean)) {
    const key = t.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(t);
    }
  }
  return out;
}

function tagConnect(names: string[]) {
  return names.map((name) => ({ where: { name }, create: { name } }));
}

function readProjectForm(formData: FormData) {
  const status = String(formData.get("status") || "Not Started");
  const priority = String(formData.get("priority") || "Medium");
  let progress = Number(formData.get("progress") || 0);
  if (Number.isNaN(progress)) progress = 0;
  progress = Math.max(0, Math.min(100, Math.round(progress)));

  const budgetRaw = String(formData.get("budgetHours") || "").trim();
  const budgetHours =
    budgetRaw && Number.isFinite(Number(budgetRaw)) && Number(budgetRaw) > 0
      ? Number(budgetRaw)
      : null;

  return {
    name: String(formData.get("name") || "").trim(),
    description: String(formData.get("description") || "").trim() || null,
    budgetHours,
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
  const user = await requireUser();
  const data = readProjectForm(formData);
  if (!data.name) return { error: "Project name is required." };
  if (!data.clientId) return { error: "Please choose a client." };

  const tags = parseTags(formData);
  const project = await prisma.project.create({
    // The first agreed due date becomes the baseline for slippage tracking.
    data: {
      ...data,
      baselineDueDate: data.dueDate,
      tags: tags.length ? { connectOrCreate: tagConnect(tags) } : undefined,
    },
  });
  if (data.dueDate) {
    await prisma.deadlineChange.create({
      data: {
        projectId: project.id,
        oldDate: null,
        newDate: data.dueDate,
        changedById: user.id,
      },
    });
  }
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
  const user = await requireUser();
  const data = readProjectForm(formData);
  if (!data.name) return { error: "Project name is required." };
  if (!data.clientId) return { error: "Please choose a client." };

  const existing = await prisma.project.findUnique({ where: { id } });
  const oldMs = existing?.dueDate?.getTime() ?? null;
  const newMs = data.dueDate?.getTime() ?? null;
  const baselineDueDate = existing?.baselineDueDate ?? data.dueDate;

  if (existing && oldMs !== newMs && (oldMs != null || newMs != null)) {
    await prisma.deadlineChange.create({
      data: {
        projectId: id,
        oldDate: existing.dueDate,
        newDate: data.dueDate,
        changedById: user.id,
      },
    });
  }

  const tags = parseTags(formData);
  await prisma.project.update({
    where: { id },
    data: {
      ...data,
      baselineDueDate,
      tags: { set: [], connectOrCreate: tagConnect(tags) },
    },
  });
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
