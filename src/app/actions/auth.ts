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

const DAY = 1000 * 60 * 60 * 24;
const daysFromNow = (n: number) => new Date(Date.now() + n * DAY);

// Seed two clearly-labeled example clients (each with a sample project) into a
// brand-new workspace, so the person setting it up has a concrete reference for
// what a filled-in client/project looks like. They're safe to edit or delete.
async function seedExampleClients(
  workspaceId: string,
  ownerId: string
): Promise<void> {
  const acme = await prisma.client.create({
    data: {
      name: "Jane Doe",
      company: "Acme Corp",
      email: "jane@acme.example",
      phone: "+1 555-0100",
      notes:
        "Example client — feel free to edit or delete. Long-standing account; prefers a weekly email summary on Fridays.",
      workspaceId,
    },
  });

  const globex = await prisma.client.create({
    data: {
      name: "John Smith",
      company: "Globex",
      email: "john@globex.example",
      phone: "+1 555-0142",
      notes:
        "Example client — feel free to edit or delete. Newly onboarded this quarter; key contact is very responsive.",
      workspaceId,
    },
  });

  // A worked example project on the first client: on track, mid-flight, with a
  // short deliverable list and an update so the dashboard has something to show.
  const redesign = await prisma.project.create({
    data: {
      name: "Website Redesign",
      description:
        "Example project — full redesign of the marketing site, design system, and CMS migration.",
      status: "On Track",
      priority: "High",
      progress: 65,
      startDate: daysFromNow(-30),
      dueDate: daysFromNow(21),
      baselineDueDate: daysFromNow(21),
      budgetHours: 120,
      clientId: acme.id,
      ownerId,
      workspaceId,
      tags: {
        connectOrCreate: ["web", "design"].map((name) => ({
          where: { workspaceId_name: { workspaceId, name } },
          create: { name, workspaceId },
        })),
      },
    },
  });

  await prisma.statusUpdate.create({
    data: {
      projectId: redesign.id,
      authorId: ownerId,
      status: "On Track",
      body: "Example update — design mockups approved; the homepage is in development.",
      createdAt: daysFromNow(-6),
    },
  });

  let order = 0;
  for (const d of [
    { name: "Discovery & sitemap", status: "Approved", dueInDays: -20 },
    { name: "Design mockups", status: "Approved", dueInDays: -5 },
    { name: "Homepage build", status: "In Progress", dueInDays: 7 },
  ]) {
    const due = daysFromNow(d.dueInDays);
    await prisma.deliverable.create({
      data: {
        projectId: redesign.id,
        name: d.name,
        status: d.status,
        ownerId,
        dueDate: due,
        baselineDueDate: due,
        approvedAt: d.status === "Approved" ? daysFromNow(-2) : null,
        order: order++,
      },
    });
  }

  // A second, not-yet-started project on the other client for contrast.
  await prisma.project.create({
    data: {
      name: "Onboarding & Setup",
      description:
        "Example project — initial account setup, integrations, and team training.",
      status: "Not Started",
      priority: "Medium",
      progress: 0,
      startDate: daysFromNow(7),
      dueDate: daysFromNow(35),
      baselineDueDate: daysFromNow(35),
      clientId: globex.id,
      ownerId,
      workspaceId,
    },
  });
}

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

  // Give the fresh workspace a couple of example clients as a reference. A
  // failure here must never block account creation, so swallow errors.
  try {
    await seedExampleClients(workspace.id, user.id);
  } catch (err) {
    console.error("Failed to seed example clients:", err);
  }

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
