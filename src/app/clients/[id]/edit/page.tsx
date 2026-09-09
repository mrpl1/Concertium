import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { clientScope } from "@/lib/access";
import { ClientForm } from "@/components/ClientForm";
import { updateClientAction } from "@/app/actions/clients";

export const dynamic = "force-dynamic";

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();

  const client = await prisma.client.findFirst({
    where: { id: (await params).id, ...clientScope(user) },
  });
  if (!client) notFound();

  const action = updateClientAction.bind(null, client.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href={`/clients/${client.id}`} className="text-sm text-brand-600">
          ← {client.company || client.name}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-gray-900">
          Edit client
        </h1>
      </div>
      <div className="card p-6">
        <ClientForm
          action={action}
          defaults={client}
          submitLabel="Save changes"
          cancelHref={`/clients/${client.id}`}
        />
      </div>
    </div>
  );
}
