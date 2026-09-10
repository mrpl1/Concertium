import { headers } from "next/headers";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/report";
import { InviteForm } from "./InviteForm";
import { InviteList } from "./InviteList";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const user = await requireAdmin();

  const [members, invites, hdrs] = await Promise.all([
    prisma.user.findMany({
      where: { workspaceId: user.workspaceId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    }),
    prisma.invite.findMany({
      where: { workspaceId: user.workspaceId, acceptedAt: null },
      orderBy: { createdAt: "desc" },
    }),
    headers(),
  ]);

  // Build an absolute origin for invite links from the request headers.
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "";
  const proto = hdrs.get("x-forwarded-proto") ?? "https";
  const origin = host ? `${proto}://${host}` : "";

  const now = Date.now();
  const pending = invites.map((i) => ({
    id: i.id,
    email: i.email,
    role: i.role,
    token: i.token,
    url: `${origin}/invite/${i.token}`,
    createdAt: i.createdAt.getTime(),
    expiresAt: i.expiresAt ? i.expiresAt.getTime() : null,
    expired: i.expiresAt ? i.expiresAt.getTime() < now : false,
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#ffffff]">Team</h1>
        <p className="text-sm text-[#ffffff]">
          Invite teammates to your workspace. New members join via an invite
          link — open self-registration is closed.
        </p>
      </div>

      <section className="card overflow-hidden">
        <div className="border-b border-[#000000] px-5 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#ffffff]">
            Members ({members.length})
          </h2>
        </div>
        <ul className="divide-y divide-[#000000]">
          {members.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between px-5 py-3"
            >
              <div>
                <p className="font-medium text-[#ffffff]">{m.name}</p>
                <p className="text-sm text-[#ffffff]">{m.email}</p>
              </div>
              <div className="text-right">
                <span
                  className={`badge ${
                    m.role === "admin"
                      ? "bg-brand-100 text-brand-700 ring-brand-300"
                      : "bg-[#141414] text-[#ffffff] ring-[#000000]"
                  }`}
                >
                  {m.role}
                </span>
                <p className="mt-1 text-xs text-[#ffffff]">
                  Joined {formatDate(m.createdAt)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#ffffff]">
          Invite a team member
        </h2>
        <InviteForm />
        <p className="mt-3 text-xs text-[#ffffff]">
          Create an invite, then share the generated link. It expires in 14
          days and can be used once.
        </p>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-[#000000] px-5 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#ffffff]">
            Pending invites ({pending.length})
          </h2>
        </div>
        <InviteList invites={pending} />
      </section>
    </div>
  );
}
