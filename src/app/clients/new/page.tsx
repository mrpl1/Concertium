import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { ClientForm } from "@/components/ClientForm";
import { createClientAction } from "@/app/actions/clients";

export default async function NewClientPage() {
  await requireUser();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/clients" className="text-sm text-brand-600">
          ← Clients
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-gray-900">
          New client
        </h1>
      </div>
      <div className="card p-6">
        <ClientForm
          action={createClientAction}
          submitLabel="Create client"
          cancelHref="/clients"
        />
      </div>
    </div>
  );
}
