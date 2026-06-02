"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export type ClientActionState = { error?: string } | undefined;

function readClientForm(formData: FormData) {
  return {
    name: String(formData.get("name") || "").trim(),
    company: String(formData.get("company") || "").trim() || null,
    email: String(formData.get("email") || "").trim() || null,
    phone: String(formData.get("phone") || "").trim() || null,
    notes: String(formData.get("notes") || "").trim() || null,
  };
}

export async function createClientAction(
  _prev: ClientActionState,
  formData: FormData
): Promise<ClientActionState> {
  await requireUser();
  const data = readClientForm(formData);
  if (!data.name) return { error: "Client name is required." };

  const client = await prisma.client.create({ data });
  revalidatePath("/clients");
  revalidatePath("/");
  redirect(`/clients/${client.id}`);
}

export async function updateClientAction(
  id: string,
  _prev: ClientActionState,
  formData: FormData
): Promise<ClientActionState> {
  await requireUser();
  const data = readClientForm(formData);
  if (!data.name) return { error: "Client name is required." };

  await prisma.client.update({ where: { id }, data });
  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  redirect(`/clients/${id}`);
}

export async function deleteClientAction(formData: FormData): Promise<void> {
  await requireUser();
  const id = String(formData.get("id") || "");
  if (id) {
    await prisma.client.delete({ where: { id } });
  }
  revalidatePath("/clients");
  revalidatePath("/");
  redirect("/clients");
}
