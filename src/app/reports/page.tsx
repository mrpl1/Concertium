import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isEmailConfigured } from "@/lib/email";
import { ReportBuilder } from "./ReportBuilder";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const user = await requireUser();

  const clients = await prisma.client.findMany({
    where: { workspaceId: user.workspaceId },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-8 py-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#ffffff]">Status reports</h1>
        <p className="text-sm text-[#ffffff]">
          Generate a status report for a client (or all clients), then draft it
          in your mail app or send it automatically.
        </p>
      </div>

      {clients.length === 0 ? (
        <div className="card rounded-[6px] border-0 bg-[var(--vibemaxx-secondary)]/40 p-10 text-center text-base text-[#ffffff] shadow-sm">
          Add a client and some projects first, then come back to build a
          report.{" "}
          <Link href="/clients/new" className="font-semibold text-[var(--vibemaxx-primary)] underline-offset-4 hover:underline">
            Add a client
          </Link>
        </div>
      ) : (
        <ReportBuilder
          clients={clients.map((c) => ({
            id: c.id,
            name: c.name,
            company: c.company,
          }))}
          initialClientId={(await searchParams).clientId ?? "all"}
          emailConfigured={isEmailConfigured()}
        />
      )}
    </div>
  );
}
