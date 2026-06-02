"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  authenticate,
  createSession,
  destroySession,
  hashPassword,
  getSessionUser,
} from "@/lib/auth";

export type ActionState = { error?: string } | undefined;

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

  // Public self-registration is only allowed to bootstrap the first account.
  // After that, teammates are added by an admin from the Team page.
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    const current = await getSessionUser();
    if (current?.role !== "admin") {
      return {
        error:
          "Registration is closed. Ask an admin to create an account for you.",
      };
    }
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with that email already exists." };
  }

  // The very first user to register becomes the admin.
  const role = userCount === 0 ? "admin" : "member";

  const user = await prisma.user.create({
    data: { name, email, passwordHash: await hashPassword(password), role },
  });

  await createSession({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
  redirect("/");
}

export async function createTeamMemberAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const current = await getSessionUser();
  if (!current || current.role !== "admin") {
    return { error: "Only admins can add team members." };
  }

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "")
    .toLowerCase()
    .trim();
  const password = String(formData.get("password") || "");
  const role = String(formData.get("role") || "member") === "admin" ? "admin" : "member";

  if (!name || !email || !password) {
    return { error: "All fields are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with that email already exists." };
  }

  await prisma.user.create({
    data: { name, email, passwordHash: await hashPassword(password), role },
  });
  revalidatePath("/team");
  return undefined;
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}

export async function registrationOpen(): Promise<boolean> {
  // Allow self-registration when there are no users yet (bootstrap),
  // or when an admin is signed in (to add teammates).
  const userCount = await prisma.user.count();
  if (userCount === 0) return true;
  const current = await getSessionUser();
  return current?.role === "admin";
}
