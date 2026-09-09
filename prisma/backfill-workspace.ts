// Idempotent backfill for workspace multi-tenancy.
//
// Run with:  npm run db:backfill   (i.e. `tsx prisma/backfill-workspace.ts`)
//
// Creates a default workspace if none exists, then attaches any users, clients,
// projects, and tags that have no workspaceId to it. Safe to run repeatedly.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 1. Ensure a default workspace exists.
  let workspace = await prisma.workspace.findFirst({ orderBy: { createdAt: "asc" } });
  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: { name: "Default Workspace", slug: "default" },
    });
    console.log(`Created default workspace "${workspace.name}" (${workspace.id}).`);
  } else {
    console.log(`Using existing workspace "${workspace.name}" (${workspace.id}).`);
  }

  // 2. Attach orphaned records. These columns are NOT NULL except on User, so we
  //    use raw filters that tolerate the nullable User column.
  const users = await prisma.user.updateMany({
    where: { workspaceId: null },
    data: { workspaceId: workspace.id },
  });

  // Client/Project/Tag workspaceId is required in the schema, but rows that
  // predate the column may have an empty value after `prisma db push`. We
  // backfill any that don't point at a real workspace.
  const clients = await prisma.client.updateMany({
    where: { workspaceId: { notIn: [workspace.id] } },
    data: { workspaceId: workspace.id },
  });
  const projects = await prisma.project.updateMany({
    where: { workspaceId: { notIn: [workspace.id] } },
    data: { workspaceId: workspace.id },
  });
  const tags = await prisma.tag.updateMany({
    where: { workspaceId: { notIn: [workspace.id] } },
    data: { workspaceId: workspace.id },
  });

  console.log(
    `Backfilled: ${users.count} user(s), ${clients.count} client(s), ${projects.count} project(s), ${tags.count} tag(s).`
  );
  console.log("Backfill complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
