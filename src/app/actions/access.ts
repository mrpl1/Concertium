"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

/**
 * Membership and assignment management.
 *
 * Admin-only. To let project members manage their own project's roster, swap
 * requireAdmin() for requireUser() + canReachProject() in the two project
 * actions — the read scoping does not change either way.
 */

/** Only touch users inside the acting admin's workspace. */
async function sameWorkspace(userId: string, workspaceId: string) {
  if (!userId) return false;
  const u = await prisma.user.findFirst({
    where: { id: userId, workspaceId },
    select: { id: true },
  });
  return Boolean(u);
}

export async function addProjectMemberAction(
  projectId: string,
  formData: FormData
): Promise<void> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") || "");
  const role = String(formData.get("role") || "member");

  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId: admin.workspaceId },
    select: { id: true },
  });
  if (!project) return;
  if (!(await sameWorkspace(userId, admin.workspaceId))) return;

  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId, userId } },
    create: { projectId, userId, role },
    update: { role },
  });
  revalidatePath(`/projects/${projectId}`);
}

export async function removeProjectMemberAction(
  projectId: string,
  formData: FormData
): Promise<void> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") || "");

  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId: admin.workspaceId },
    select: { id: true },
  });
  if (!project) return;

  await prisma.projectMember.deleteMany({ where: { projectId, userId } });
  revalidatePath(`/projects/${projectId}`);
}

export async function addClientAssigneeAction(
  clientId: string,
  formData: FormData
): Promise<void> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") || "");

  const client = await prisma.client.findFirst({
    where: { id: clientId, workspaceId: admin.workspaceId },
    select: { id: true },
  });
  if (!client) return;
  if (!(await sameWorkspace(userId, admin.workspaceId))) return;

  await prisma.clientAssignment.upsert({
    where: { clientId_userId: { clientId, userId } },
    create: { clientId, userId },
    update: {},
  });
  revalidatePath(`/clients/${clientId}`);
}

export async function removeClientAssigneeAction(
  clientId: string,
  formData: FormData
): Promise<void> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") || "");

  const client = await prisma.client.findFirst({
    where: { id: clientId, workspaceId: admin.workspaceId },
    select: { id: true },
  });
  if (!client) return;

  await prisma.clientAssignment.deleteMany({ where: { clientId, userId } });
  revalidatePath(`/clients/${clientId}`);
}
