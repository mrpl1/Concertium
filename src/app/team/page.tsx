import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/report";
import { TeamMemberForm } from "./TeamMemberForm";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");

  const members = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Team</h1>
        <p className="text-sm text-gray-500">
          Add teammates and manage who can access Concertium.
        </p>
      </div>

      <section className="card overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Members ({members.length})
          </h2>
        </div>
        <ul className="divide-y divide-gray-100">
          {members.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between px-5 py-3"
            >
              <div>
                <p className="font-medium text-gray-900">{m.name}</p>
                <p className="text-sm text-gray-500">{m.email}</p>
              </div>
              <div className="text-right">
                <span
                  className={`badge ${
                    m.role === "admin"
                      ? "bg-brand-100 text-brand-700 ring-brand-300"
                      : "bg-gray-100 text-gray-600 ring-gray-300"
                  }`}
                >
                  {m.role}
                </span>
                <p className="mt-1 text-xs text-gray-400">
                  Joined {formatDate(m.createdAt)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Add a team member
        </h2>
        <TeamMemberForm />
        <p className="mt-3 text-xs text-gray-500">
          Share the temporary password with the new member — they can use it to
          sign in.
        </p>
      </section>
    </div>
  );
}
