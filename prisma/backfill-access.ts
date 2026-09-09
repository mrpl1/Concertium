/**
 * Backfill for the two-layer access model.
 *
 * Run once, immediately after the ProjectMember / ClientAssignment tables are
 * created. It deliberately grants MORE access than the final intent: every
 * existing user is assigned to every client in their workspace, so that
 * shipping access control changes nothing anyone can see on day one.
 *
 * Access then narrows deliberately — an admin removes assignments — rather
 * than by surprise, which is the failure mode where people arrive at work to
 * find their projects gone.
 *
 *   npm run db:backfill-access
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 1. Every project owner becomes a member of the project they own.
  const owned = await prisma.project.findMany({
    where: { ownerId: { not: null } },
    select: { id: true, ownerId: true },
  });
  if (owned.length) {
    const { count } = await prisma.projectMember.createMany({
      data: owned.map((p) => ({
        projectId: p.id,
        userId: p.ownerId as string,
        role: "lead",
      })),
      skipDuplicates: true,
    });
    console.log(`Project owners added as leads: ${count}`);
  } else {
    console.log("No owned projects to backfill.");
  }

  // 2. Every user is assigned to every client in their workspace, so nothing
  //    disappears when scoping goes live.
  const users = await prisma.user.findMany({
    where: { workspaceId: { not: null } },
    select: { id: true, workspaceId: true },
  });

  let assignments = 0;
  for (const user of users) {
    const clients = await prisma.client.findMany({
      where: { workspaceId: user.workspaceId as string },
      select: { id: true },
    });
    if (!clients.length) continue;
    const { count } = await prisma.clientAssignment.createMany({
      data: clients.map((c) => ({ clientId: c.id, userId: user.id })),
      skipDuplicates: true,
    });
    assignments += count;
  }
  console.log(`Client assignments created: ${assignments}`);
  console.log("Done. Narrow access from each project or client page.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
