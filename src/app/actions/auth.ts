"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import {
  authenticate,
  createSession,
  destroySession,
  hashPassword,
  getSessionUser,
} from "@/lib/auth";

export type ActionState = { error?: string } | undefined;

// Build a URL-friendly, unique workspace slug from a display name.
async function uniqueSlug(name: string): Promise<string> {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "workspace";
  // Always append a short random suffix so slugs are effectively unique.
  for (let i = 0; i < 5; i++) {
    const slug = `${base}-${randomBytes(3).toString("hex")}`;
    const existing = await prisma.workspace.findUnique({ where: { slug } });
    if (!existing) return slug;
  }
  return `${base}-${randomBytes(6).toString("hex")}`;
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const user = await authenticate(email, password);
  if (!user) {
    return { error: "Invalid email or password." };
  }

  await createSession(user);
  redirect(next && next.startsWith("/") ? next : "/");
}

export async function registerAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "")
    .toLowerCase()
    .trim();
  const password = String(formData.get("password") || "");

  if (!name || !email || !password) {
    return { error: "All fields are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  // Open self-registration is closed. It is only allowed to bootstrap the very
  // first account, which creates the first workspace and becomes its admin.
  // Everyone else joins via an invite link (see acceptInviteAction).
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    return {
      error:
        "Registration is closed. Ask a workspace admin for an invite link.",
    };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with that email already exists." };
  }

  const workspace = await prisma.workspace.create({
    data: { name: `${name}'s Workspace`, slug: await uniqueSlug(name) },
  });

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(password),
      role: "admin",
      workspaceId: workspace.id,
    },
  });

  await createSession({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    workspaceId: workspace.id,
  });
  redirect("/");
}

// Accept an invite: validate the token, create the user in that invite's
// workspace with the invite's role, mark it accepted, and start a session.
export async function acceptInviteAction(
  token: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const name = String(formData.get("name") || "").trim();
  const password = String(formData.get("password") || "");

  if (!name || !password) {
    return { error: "Name and password are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite) return { error: "This invite link is not valid." };
  if (invite.acceptedAt) {
    return { error: "This invite has already been used." };
  }
  if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
    return { error: "This invite link has expired." };
  }

  // If the invite was addressed to a specific email, use it; otherwise the
  // invitee provides their own.
  const email = (
    invite.email || String(formData.get("email") || "")
  )
    .toLowerCase()
    .trim();
  if (!email) return { error: "Email is required." };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with that email already exists." };
  }

  const role = invite.role === "admin" ? "admin" : "member";
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(password),
      role,
      workspaceId: invite.workspaceId,
    },
  });

  await prisma.invite.update({
    where: { id: invite.id },
    data: { acceptedAt: new Date() },
  });

  await createSession({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    workspaceId: invite.workspaceId,
  });
  redirect("/");
}

// Admin-only: create an invite link for the current admin's workspace.
export async function createInviteAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const current = await getSessionUser();
  if (!current || current.role !== "admin") {
    return { error: "Only admins can create invites." };
  }

  const email = String(formData.get("email") || "")
    .toLowerCase()
    .trim();
  const role =
    String(formData.get("role") || "member") === "admin" ? "admin" : "member";

  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  await prisma.invite.create({
    data: {
      token,
      email: email || null,
      role,
      workspaceId: current.workspaceId,
      invitedById: current.id,
      expiresAt,
    },
  });
  revalidatePath("/team");
  return undefined;
}

// Admin-only: delete a pending invite belonging to the admin's workspace.
export async function revokeInviteAction(formData: FormData): Promise<void> {
  const current = await getSessionUser();
  if (!current || current.role !== "admin") return;
  const id = String(formData.get("id") || "");
  if (!id) return;
  await prisma.invite.deleteMany({
    where: { id, workspaceId: current.workspaceId },
  });
  revalidatePath("/team");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}

export async function registrationOpen(): Promise<boolean> {
  // Open self-registration is only available to bootstrap the first account.
  const userCount = await prisma.user.count();
  return userCount === 0;
}
