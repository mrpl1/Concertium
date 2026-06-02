"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export type ExtrasState = { error?: string } | undefined;

// ---- Resources / links ----
export async function addLinkAction(
  _prev: ExtrasState,
  formData: FormData
): Promise<ExtrasState> {
  await requireUser();
  const projectId = String(formData.get("projectId") || "");
  const label = String(formData.get("label") || "").trim();
  let url = String(formData.get("url") || "").trim();
  if (!projectId) return { error: "Missing project." };
  if (!label || !url) return { error: "Label and URL are required." };
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

  await prisma.projectLink.create({ data: { projectId, label, url } });
  revalidatePath(`/projects/${projectId}`);
  return undefined;
}

export async function deleteLinkAction(formData: FormData): Promise<void> {
  await requireUser();
  const id = String(formData.get("id") || "");
  if (!id) return;
  const link = await prisma.projectLink.findUnique({ where: { id } });
  if (!link) return;
  await prisma.projectLink.delete({ where: { id } });
  revalidatePath(`/projects/${link.projectId}`);
}

// ---- Time entries ----
export async function addTimeEntryAction(
  _prev: ExtrasState,
  formData: FormData
): Promise<ExtrasState> {
  const user = await requireUser();
  const projectId = String(formData.get("projectId") || "");
  const hours = Number(formData.get("hours"));
  if (!projectId) return { error: "Missing project." };
  if (!Number.isFinite(hours) || hours <= 0)
    return { error: "Enter a positive number of hours." };

  const dateStr = String(formData.get("date") || "").trim();
  const date = dateStr ? new Date(dateStr) : new Date();

  await prisma.timeEntry.create({
    data: {
      projectId,
      userId: user.id,
      hours,
      note: String(formData.get("note") || "").trim() || null,
      date: Number.isNaN(date.getTime()) ? new Date() : date,
    },
  });
  revalidatePath(`/projects/${projectId}`);
  return undefined;
}

export async function deleteTimeEntryAction(formData: FormData): Promise<void> {
  await requireUser();
  const id = String(formData.get("id") || "");
  if (!id) return;
  const entry = await prisma.timeEntry.findUnique({ where: { id } });
  if (!entry) return;
  await prisma.timeEntry.delete({ where: { id } });
  revalidatePath(`/projects/${entry.projectId}`);
}
