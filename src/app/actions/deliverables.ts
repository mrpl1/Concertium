"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { canReachProject } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { DELIVERABLE_STATUSES } from "@/lib/constants";

export type DeliverableActionState = { error?: string } | undefined;

function parseDate(value: FormDataEntryValue | null): Date | null {
  const s = String(value || "").trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function cleanStatus(s: string): string {
  return (DELIVERABLE_STATUSES as readonly string[]).includes(s) ? s : "Pending";
}

// Confirm the user may reach this project (workspace + membership/assignment).
async function ownsProject(projectId: string, user: SessionUser): Promise<boolean> {
  if (!projectId) return false;
  return canReachProject(projectId, user);
}

export async function createDeliverableAction(
  _prev: DeliverableActionState,
  formData: FormData
): Promise<DeliverableActionState> {
  const user = await requireUser();
  const projectId = String(formData.get("projectId") || "");
  if (!projectId) return { error: "Missing project." };
  if (!(await ownsProject(projectId, user)))
    return { error: "Project not found." };
  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: "Deliverable name is required." };

  const dueDate = parseDate(formData.get("dueDate"));
  const status = cleanStatus(String(formData.get("status") || "Pending"));
  const ownerId = String(formData.get("ownerId") || "") || null;

  const last = await prisma.deliverable.findFirst({
    where: { projectId },
    orderBy: { order: "desc" },
  });

  await prisma.deliverable.create({
    data: {
      projectId,
      name,
      description: String(formData.get("description") || "").trim() || null,
      status,
      dueDate,
      // The first agreed date becomes the baseline for slippage tracking.
      baselineDueDate: dueDate,
      approvedAt: status === "Approved" ? new Date() : null,
      ownerId,
      order: (last?.order ?? 0) + 1,
    },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");
  return undefined;
}

export async function updateDeliverableAction(
  _prev: DeliverableActionState,
  formData: FormData
): Promise<DeliverableActionState> {
  const user = await requireUser();
  const id = String(formData.get("id") || "");
  const existing = await prisma.deliverable.findUnique({ where: { id } });
  if (!existing) return { error: "Deliverable not found." };
  if (!(await ownsProject(existing.projectId, user)))
    return { error: "Deliverable not found." };

  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: "Deliverable name is required." };

  const dueDate = parseDate(formData.get("dueDate"));
  const status = cleanStatus(String(formData.get("status") || existing.status));
  const ownerId = String(formData.get("ownerId") || "") || null;

  // Track due-date changes for slippage reporting.
  const oldMs = existing.dueDate?.getTime() ?? null;
  const newMs = dueDate?.getTime() ?? null;
  const dueChanged = oldMs !== newMs;
  const baselineDueDate = existing.baselineDueDate ?? dueDate;

  if (dueChanged && (oldMs != null || newMs != null)) {
    await prisma.deadlineChange.create({
      data: {
        projectId: existing.projectId,
        deliverableId: id,
        oldDate: existing.dueDate,
        newDate: dueDate,
        reason: String(formData.get("reason") || "").trim() || null,
        changedById: user.id,
      },
    });
  }

  await prisma.deliverable.update({
    where: { id },
    data: {
      name,
      description: String(formData.get("description") || "").trim() || null,
      status,
      dueDate,
      baselineDueDate,
      approvedAt:
        status === "Approved"
          ? existing.approvedAt ?? new Date()
          : null,
      ownerId,
    },
  });

  revalidatePath(`/projects/${existing.projectId}`);
  revalidatePath("/");
  return undefined;
}

// Lightweight status-only change (used by the inline status dropdown).
export async function setDeliverableStatusAction(
  formData: FormData
): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") || "");
  const status = cleanStatus(String(formData.get("status") || "Pending"));
  if (!id) return;

  const existing = await prisma.deliverable.findUnique({ where: { id } });
  if (!existing) return;
  if (!(await ownsProject(existing.projectId, user))) return;

  await prisma.deliverable.update({
    where: { id },
    data: {
      status,
      approvedAt:
        status === "Approved" ? existing.approvedAt ?? new Date() : null,
    },
  });

  revalidatePath(`/projects/${existing.projectId}`);
  revalidatePath("/");
}

export async function deleteDeliverableAction(
  formData: FormData
): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") || "");
  if (!id) return;
  const existing = await prisma.deliverable.findUnique({ where: { id } });
  if (!existing) return;
  if (!(await ownsProject(existing.projectId, user))) return;
  await prisma.deliverable.delete({ where: { id } });
  revalidatePath(`/projects/${existing.projectId}`);
  revalidatePath("/");
}
