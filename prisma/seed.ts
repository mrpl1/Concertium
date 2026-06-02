import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Helper: a date N days from now (negative = in the past).
const DAY = 1000 * 60 * 60 * 24;
const daysFromNow = (n: number) => new Date(Date.now() + n * DAY);

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@concertium.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "changeme123";

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Alex Morgan",
      passwordHash: await bcrypt.hash(adminPassword, 10),
      role: "admin",
    },
  });

  // A couple of extra teammates so projects have varied owners.
  const memberPassword = await bcrypt.hash("changeme123", 10);
  const priya = await prisma.user.upsert({
    where: { email: "priya@concertium.local" },
    update: {},
    create: {
      email: "priya@concertium.local",
      name: "Priya Nair",
      passwordHash: memberPassword,
      role: "member",
    },
  });
  const sam = await prisma.user.upsert({
    where: { email: "sam@concertium.local" },
    update: {},
    create: {
      email: "sam@concertium.local",
      name: "Sam Chen",
      passwordHash: memberPassword,
      role: "member",
    },
  });

  // Only seed sample clients/projects if the database is otherwise empty,
  // so re-running the seed never duplicates data.
  const clientCount = await prisma.client.count();
  if (clientCount > 0) {
    console.log("Sample data already present — skipping.");
    console.log(`Admin login: ${adminEmail} / ${adminPassword}`);
    return;
  }

  // ---- Clients ----
  const acme = await prisma.client.create({
    data: {
      name: "Jane Doe",
      company: "Acme Corp",
      email: "jane@acme.example",
      phone: "+1 555-0100",
      notes:
        "Long-standing client. Quarterly business reviews. Prefers weekly email summaries on Fridays.",
    },
  });

  const globex = await prisma.client.create({
    data: {
      name: "John Smith",
      company: "Globex",
      email: "john@globex.example",
      phone: "+1 555-0142",
      notes: "New client onboarded this quarter. Key contact is very responsive.",
    },
  });

  const initech = await prisma.client.create({
    data: {
      name: "Maria Lopez",
      company: "Initech",
      email: "maria@initech.example",
      phone: "+1 555-0188",
      notes: "Enterprise account. Multiple stakeholders — loop in legal for contracts.",
    },
  });

  const umbrella = await prisma.client.create({
    data: {
      name: "David Park",
      company: "Umbrella Labs",
      email: "david@umbrella.example",
      notes: "Early-stage startup. Budget-conscious; scope changes frequently.",
    },
  });

  const wonka = await prisma.client.create({
    data: {
      name: "Nina Patel",
      company: "Wonka Industries",
      email: "nina@wonka.example",
      phone: "+1 555-0117",
      notes: "Referral from Acme. Phase 1 wrapped up successfully.",
    },
  });

  // ---- Projects (spanning every status & priority) ----
  // Each entry optionally carries updates that build a short history.
  const projects: {
    data: Parameters<typeof prisma.project.create>[0]["data"];
    updates?: { author: string; status?: string; body: string; daysAgo: number }[];
  }[] = [
    {
      data: {
        name: "Website Redesign",
        description:
          "Full redesign of the marketing site, design system, and CMS migration.",
        status: "On Track",
        priority: "High",
        progress: 65,
        startDate: daysFromNow(-30),
        dueDate: daysFromNow(21),
        clientId: acme.id,
        ownerId: admin.id,
      },
      updates: [
        {
          author: admin.id,
          status: "On Track",
          body: "Kicked off discovery and confirmed scope with stakeholders.",
          daysAgo: 28,
        },
        {
          author: priya.id,
          status: "On Track",
          body: "Design mockups approved. Homepage and nav are in development.",
          daysAgo: 6,
        },
      ],
    },
    {
      data: {
        name: "SEO Audit",
        description: "Technical SEO audit and remediation roadmap.",
        status: "At Risk",
        priority: "Medium",
        progress: 35,
        startDate: daysFromNow(-18),
        dueDate: daysFromNow(5),
        clientId: acme.id,
        ownerId: sam.id,
      },
      updates: [
        {
          author: sam.id,
          status: "At Risk",
          body: "Crawl complete, but waiting on analytics access — this may slip the deadline.",
          daysAgo: 3,
        },
      ],
    },
    {
      data: {
        name: "Onboarding & Setup",
        description: "Initial account setup, integrations, and team training.",
        status: "Not Started",
        priority: "Medium",
        progress: 0,
        startDate: daysFromNow(7),
        dueDate: daysFromNow(35),
        clientId: globex.id,
        ownerId: priya.id,
      },
    },
    {
      data: {
        name: "Mobile App MVP",
        description: "iOS/Android MVP for the customer loyalty program.",
        status: "On Track",
        priority: "High",
        progress: 45,
        startDate: daysFromNow(-40),
        dueDate: daysFromNow(45),
        clientId: globex.id,
        ownerId: sam.id,
      },
      updates: [
        {
          author: sam.id,
          status: "On Track",
          body: "Auth and onboarding flows done. Starting the rewards screen.",
          daysAgo: 4,
        },
      ],
    },
    {
      data: {
        name: "Data Migration",
        description: "Migrate legacy CRM data into the new platform.",
        status: "Off Track",
        priority: "High",
        progress: 20,
        startDate: daysFromNow(-25),
        dueDate: daysFromNow(-2),
        clientId: initech.id,
        ownerId: admin.id,
      },
      updates: [
        {
          author: admin.id,
          status: "Off Track",
          body: "Source data quality is worse than expected; deadline missed. Escalated to client for a revised timeline.",
          daysAgo: 1,
        },
      ],
    },
    {
      data: {
        name: "Security Review",
        description: "Annual penetration test and compliance review.",
        status: "On Hold",
        priority: "Medium",
        progress: 10,
        startDate: daysFromNow(-10),
        dueDate: daysFromNow(60),
        clientId: initech.id,
        ownerId: priya.id,
      },
      updates: [
        {
          author: priya.id,
          status: "On Hold",
          body: "Paused pending the client's procurement of the testing environment.",
          daysAgo: 8,
        },
      ],
    },
    {
      data: {
        name: "Brand Identity",
        description: "Logo, color system, and brand guidelines for launch.",
        status: "On Track",
        priority: "Low",
        progress: 50,
        startDate: daysFromNow(-14),
        dueDate: daysFromNow(14),
        clientId: umbrella.id,
        ownerId: priya.id,
      },
    },
    {
      data: {
        name: "Pricing Experiment",
        description: "A/B test of new pricing tiers on the landing page.",
        status: "At Risk",
        priority: "Low",
        progress: 40,
        startDate: daysFromNow(-12),
        dueDate: daysFromNow(3),
        clientId: umbrella.id,
        ownerId: sam.id,
      },
      updates: [
        {
          author: sam.id,
          status: "At Risk",
          body: "Traffic is lower than needed for significance — considering extending the test window.",
          daysAgo: 2,
        },
      ],
    },
    {
      data: {
        name: "Phase 1 Launch",
        description: "Initial product launch and go-live support.",
        status: "Completed",
        priority: "High",
        progress: 100,
        startDate: daysFromNow(-90),
        dueDate: daysFromNow(-15),
        clientId: wonka.id,
        ownerId: admin.id,
      },
      updates: [
        {
          author: admin.id,
          status: "Completed",
          body: "Launched on schedule with no major incidents. Retrospective scheduled.",
          daysAgo: 14,
        },
      ],
    },
    {
      data: {
        name: "Analytics Dashboard",
        description: "Self-serve reporting dashboard for the client's ops team.",
        status: "Not Started",
        priority: "Medium",
        progress: 0,
        startDate: daysFromNow(10),
        dueDate: daysFromNow(50),
        clientId: wonka.id,
        ownerId: priya.id,
      },
    },
  ];

  for (const p of projects) {
    const created = await prisma.project.create({ data: p.data });
    for (const u of p.updates ?? []) {
      await prisma.statusUpdate.create({
        data: {
          projectId: created.id,
          authorId: u.author,
          status: u.status ?? null,
          body: u.body,
          createdAt: daysFromNow(-u.daysAgo),
        },
      });
    }
  }

  console.log("Seed complete.");
  console.log(
    `Seeded ${projects.length} projects across 5 clients and 3 team members.`
  );
  console.log(`Admin login: ${adminEmail} / ${adminPassword}`);
  console.log("Member logins: priya@concertium.local / sam@concertium.local (password: changeme123)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
