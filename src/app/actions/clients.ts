"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { clientScope } from "@/lib/access";
import { requireUser } from "@/lib/auth";

export type ClientActionState = { error?: string } | undefined;

function readClientForm(formData: FormData) {
  return {
    name: String(formData.get("name") || "").trim(),
    company: String(formData.get("company") || "").trim() || null,
    email: String(formData.get("email") || "").trim() || null,
    phone: String(formData.get("phone") || "").trim() || null,
    notes: String(formData.get("notes") || "").trim() || null,
    weeklyReport: formData.get("weeklyReport") === "on",
  };
}

// Confirm the user may reach this client before mutating it. Scoped, so a
// client outside their assignments/memberships is simply not found.
async function ownClient(id: string, user: SessionUser) {
  if (!id) return null;
  return prisma.client.findFirst({ where: { id, ...clientScope(user) } });
}

export async function createClientAction(
  _prev: ClientActionState,
  formData: FormData
): Promise<ClientActionState> {
  const user = await requireUser();
  const data = readClientForm(formData);
  if (!data.name) return { error: "Client name is required." };

  const client = await prisma.client.create({
    data: { ...data, workspaceId: user.workspaceId },
  });

  // The creator is assigned to the client, so they can still see what they
  // just made. Admins see everything regardless.
  await prisma.clientAssignment.create({
    data: { clientId: client.id, userId: user.id },
  });
  revalidatePath("/clients");
  revalidatePath("/");
  redirect(`/clients/${client.id}`);
}

export async function updateClientAction(
  id: string,
  _prev: ClientActionState,
  formData: FormData
): Promise<ClientActionState> {
  const user = await requireUser();
  const data = readClientForm(formData);
  if (!data.name) return { error: "Client name is required." };

  const existing = await ownClient(id, user);
  if (!existing) return { error: "Client not found." };

  await prisma.client.update({ where: { id }, data });
  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  redirect(`/clients/${id}`);
}

export async function generateShareLinkAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") || "");
  if (!(await ownClient(id, user))) return;
  const { randomBytes } = await import("node:crypto");
  const token = randomBytes(18).toString("base64url");
  await prisma.client.update({ where: { id }, data: { shareToken: token } });
  revalidatePath(`/clients/${id}`);
}

export async function revokeShareLinkAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") || "");
  if (!(await ownClient(id, user))) return;
  await prisma.client.update({ where: { id }, data: { shareToken: null } });
  revalidatePath(`/clients/${id}`);
}

export async function deleteClientAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") || "");
  if (await ownClient(id, user)) {
    await prisma.client.delete({ where: { id } });
  }
  revalidatePath("/clients");
  revalidatePath("/");
  redirect("/clients");
}
