"use client";

import { useRef } from "react";
import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/SubmitButton";
import {
  addLinkAction,
  deleteLinkAction,
  type ExtrasState,
} from "@/app/actions/projectExtras";

export type LinkItem = { id: string; label: string; url: string };

export function ProjectResources({
  projectId,
  links,
}: {
  projectId: string;
  links: LinkItem[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useFormState<ExtrasState, FormData>(
    async (prev, fd) => {
      const r = await addLinkAction(prev, fd);
      if (!r?.error) formRef.current?.reset();
      return r;
    },
    undefined
  );

  return (
    <section className="card p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Resources & links
      </h2>

      {links.length > 0 ? (
        <ul className="mb-4 divide-y divide-gray-100">
          {links.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-3 py-2">
              <a
                href={l.url}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 truncate text-sm font-medium text-brand-700 hover:underline"
              >
                {l.label}
                <span className="ml-2 truncate text-xs font-normal text-gray-400">
                  {l.url}
                </span>
              </a>
              <form action={deleteLinkAction}>
                <input type="hidden" name="id" value={l.id} />
                <button className="text-xs text-gray-400 hover:text-red-600">
                  Remove
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-4 text-sm text-gray-500">
          Link the SOW, contract, designs, or any shared docs for this project.
        </p>
      )}

      <form ref={formRef} action={action} className="flex flex-wrap gap-2">
        <input type="hidden" name="projectId" value={projectId} />
        <input name="label" placeholder="Label" className="input w-36" required />
        <input name="url" placeholder="https://…" className="input flex-1" required />
        <SubmitButton className="btn-secondary !py-1.5">Add</SubmitButton>
      </form>
      {state?.error ? (
        <p className="mt-2 text-sm text-red-600">{state.error}</p>
      ) : null}
    </section>
  );
}
