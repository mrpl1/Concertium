import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@concertium.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "changeme123";

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Admin",
      passwordHash,
      role: "admin",
    },
  });

  // Only seed sample data if the database is otherwise empty.
  const clientCount = await prisma.client.count();
  if (clientCount === 0) {
    const acme = await prisma.client.create({
      data: {
        name: "Jane Doe",
        company: "Acme Corp",
        email: "jane@acme.example",
        phone: "+1 555-0100",
        notes: "Long-standing client. Quarterly business reviews.",
      },
    });

    const globex = await prisma.client.create({
      data: {
        name: "John Smith",
        company: "Globex",
        email: "john@globex.example",
        notes: "New client onboarded this quarter.",
      },
    });

    const p1 = await prisma.project.create({
      data: {
        name: "Website Redesign",
        description: "Full redesign of the marketing site and CMS migration.",
        status: "On Track",
        priority: "High",
        progress: 60,
        dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 21),
        clientId: acme.id,
        ownerId: admin.id,
      },
    });

    await prisma.project.create({
      data: {
        name: "SEO Audit",
        description: "Technical SEO audit and remediation plan.",
        status: "At Risk",
        priority: "Medium",
        progress: 30,
        dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
        clientId: acme.id,
        ownerId: admin.id,
      },
    });

    await prisma.project.create({
      data: {
        name: "Onboarding & Setup",
        description: "Initial account setup and integration.",
        status: "Not Started",
        priority: "Medium",
        progress: 0,
        clientId: globex.id,
        ownerId: admin.id,
      },
    });

    await prisma.statusUpdate.create({
      data: {
        projectId: p1.id,
        authorId: admin.id,
        status: "On Track",
        body: "Design mockups approved. Development of the homepage is underway.",
      },
    });
  }

  console.log("Seed complete.");
  console.log(`Admin login: ${adminEmail} / ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
