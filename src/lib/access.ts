import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";

/**
 * Visibility scoping.
 *
 * Workspace tenancy is the outer boundary — nothing here reaches across
 * workspaces. Inside a workspace there are two ways to be granted sight of a
 * project:
 *
 *   1. ClientAssignment — you run the whole client relationship, so you see
 *      every project under it.
 *   2. ProjectMember    — you were pulled onto one project, so you see that
 *      one and nothing else of that client's.
 *
 * Workspace admins bypass both: they need the whole portfolio for oversight,
 * reporting and reassigning work.
 *
 * Every read filter and every write authorization goes through this module.
 * Do NOT reintroduce inline `where: { workspaceId: user.workspaceId }` on
 * projects or clients — that is the pattern this layer replaces, and a missed
 * call site silently returns other people's rows rather than throwing.
 */

export function isAdmin(u: SessionUser): boolean {
  return u.role === "admin";
}

/** `where` fragment selecting the projects this user may see. */
export function projectScope(u: SessionUser) {
  if (isAdmin(u)) return { workspaceId: u.workspaceId };
  return {
    workspaceId: u.workspaceId,
    OR: [
      { members: { some: { userId: u.id } } },
      { client: { assignees: { some: { userId: u.id } } } },
    ],
  };
}

/**
 * `where` fragment selecting the clients this user may see. A client becomes
 * visible as soon as one of its projects is — otherwise a visible project
 * would have no navigable parent. The client's project list is scoped
 * separately, so its presence never reveals the rest of the engagement.
 */
export function clientScope(u: SessionUser) {
  if (isAdmin(u)) return { workspaceId: u.workspaceId };
  return {
    workspaceId: u.workspaceId,
    OR: [
      { assignees: { some: { userId: u.id } } },
      { projects: { some: { members: { some: { userId: u.id } } } } },
    ],
  };
}

/**
 * Authorize a project by id, scoped. Returns 404 rather than 403 for anything
 * out of reach, so the response never confirms that an id exists.
 */
export async function requireProject(id: string, u: SessionUser) {
  const project = await prisma.project.findFirst({
    where: { id, ...projectScope(u) },
    select: { id: true, clientId: true, workspaceId: true },
  });
  if (!project) notFound();
  return project;
}

/** Authorize a client by id, scoped. */
export async function requireClient(id: string, u: SessionUser) {
  const client = await prisma.client.findFirst({
    where: { id, ...clientScope(u) },
    select: { id: true, workspaceId: true },
  });
  if (!client) notFound();
  return client;
}

/** Existence check for server actions, which return errors rather than 404. */
export async function canReachProject(id: string, u: SessionUser): Promise<boolean> {
  const found = await prisma.project.findFirst({
    where: { id, ...projectScope(u) },
    select: { id: true },
  });
  return Boolean(found);
}

/** Existence check for server actions, client side. */
export async function canReachClient(id: string, u: SessionUser): Promise<boolean> {
  const found = await prisma.client.findFirst({
    where: { id, ...clientScope(u) },
    select: { id: true },
  });
  return Boolean(found);
}
