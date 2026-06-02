"use client";

import { useFormState } from "react-dom";
import Link from "next/link";
import { SubmitButton } from "@/components/SubmitButton";
import type { ClientActionState } from "@/app/actions/clients";

type Defaults = {
  name?: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  weeklyReport?: boolean;
};

export function ClientForm({
  action,
  defaults,
  submitLabel,
  cancelHref,
}: {
  action: (
    prev: ClientActionState,
    formData: FormData
  ) => Promise<ClientActionState>;
  defaults?: Defaults;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction] = useFormState(action, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="name">
          Contact name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={defaults?.name ?? ""}
          className="input"
          placeholder="Jane Doe"
        />
      </div>
      <div>
        <label className="label" htmlFor="company">
          Company
        </label>
        <input
          id="company"
          name="company"
          defaultValue={defaults?.company ?? ""}
          className="input"
          placeholder="Acme Corp"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={defaults?.email ?? ""}
            className="input"
            placeholder="jane@acme.com"
          />
        </div>
        <div>
          <label className="label" htmlFor="phone">
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            defaultValue={defaults?.phone ?? ""}
            className="input"
            placeholder="+1 555-0100"
          />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="notes">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={defaults?.notes ?? ""}
          className="input"
          placeholder="Context, history, preferences…"
        />
      </div>
      <label className="flex items-start gap-2 rounded-lg bg-gray-50 p-3 ring-1 ring-gray-200">
        <input
          type="checkbox"
          name="weeklyReport"
          defaultChecked={defaults?.weeklyReport ?? false}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
        />
        <span className="text-sm">
          <span className="font-medium text-gray-800">Send weekly status report</span>
          <span className="block text-xs text-gray-500">
            Emails this client a status report automatically on the scheduled day
            (requires the client&apos;s email + SMTP configured).
          </span>
        </span>
      </label>
      {state?.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}
      <div className="flex gap-2">
        <SubmitButton className="btn-primary">{submitLabel}</SubmitButton>
        <Link href={cancelHref} className="btn-secondary">
          Cancel
        </Link>
      </div>
    </form>
  );
}
