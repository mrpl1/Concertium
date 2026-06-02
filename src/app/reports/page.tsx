import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isEmailConfigured } from "@/lib/email";
import { ReportBuilder } from "./ReportBuilder";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { clientId?: string };
}) {
  await requireUser();

  const clients = await prisma.client.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Status reports</h1>
        <p className="text-sm text-gray-500">
          Generate a status report for a client (or all clients), then draft it
          in your mail app or send it automatically.
        </p>
      </div>

      {clients.length === 0 ? (
        <div className="card p-10 text-center text-sm text-gray-500">
          Add a client and some projects first, then come back to build a
          report.{" "}
          <Link href="/clients/new" className="font-medium text-brand-600">
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
          initialClientId={searchParams.clientId ?? "all"}
          emailConfigured={isEmailConfigured()}
        />
      )}
    </div>
  );
}
