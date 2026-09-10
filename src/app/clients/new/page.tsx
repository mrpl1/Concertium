import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { ClientForm } from "@/components/ClientForm";
import { createClientAction } from "@/app/actions/clients";

export default async function NewClientPage() {
  await requireUser();

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Link href="/clients" className="text-sm font-medium text-brand-600 hover:underline">
          ← Clients
        </Link>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-900">
          New client
        </h1>
      </div>
      <div className="card rounded-md border-0 bg-white p-8 shadow-xl shadow-black/5">
        <ClientForm
          action={createClientAction}
          submitLabel="Create client"
          cancelHref="/clients"
        />
      </div>
    </div>
  );
}
