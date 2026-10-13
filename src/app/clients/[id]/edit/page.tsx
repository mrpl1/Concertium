import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ClientForm } from "@/components/ClientForm";
import { updateClientAction } from "@/app/actions/clients";

export const dynamic = "force-dynamic";

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();

  const client = await prisma.client.findUnique({ where: { id: (await params).id } });
  if (!client || client.workspaceId !== user.workspaceId) notFound();

  const action = updateClientAction.bind(null, client.id);

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-8 py-10">
      <div>
        <Link href={`/clients/${client.id}`} className="text-base font-medium text-[var(--vibemaxx-primary)] hover:text-[var(--vibemaxx-accent)] transition-colors">
          ← {client.company || client.name}
        </Link>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-[#ffffff]">
          Edit client
        </h1>
      </div>
      <div className="card rounded-[2rem] bg-white p-8 shadow-xl shadow-[#0066cc]/10 border-0">
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
