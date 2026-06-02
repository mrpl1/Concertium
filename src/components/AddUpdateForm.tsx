"use client";

import { useRef } from "react";
import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/SubmitButton";
import { PROJECT_STATUSES } from "@/lib/constants";
import type { ProjectActionState } from "@/app/actions/projects";

export function AddUpdateForm({
  action,
  currentStatus,
}: {
  action: (
    prev: ProjectActionState,
    formData: FormData
  ) => Promise<ProjectActionState>;
  currentStatus: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useFormState(
    async (prev: ProjectActionState, formData: FormData) => {
      const result = await action(prev, formData);
      if (!result?.error) formRef.current?.reset();
      return result;
    },
    undefined
  );

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <textarea
        name="body"
        rows={3}
        required
        className="input"
        placeholder="Post a status update…"
      />
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-gray-600">
          Set status to
          <select
            name="status"
            defaultValue={currentStatus}
            className="input ml-2 inline-block w-auto"
          >
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <SubmitButton className="btn-primary" pendingText="Posting…">
          Post update
        </SubmitButton>
      </div>
      {state?.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}
    </form>
  );
}
