"use client";

import { useRef } from "react";
import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/SubmitButton";
import {
  addTimeEntryAction,
  deleteTimeEntryAction,
  type ExtrasState,
} from "@/app/actions/projectExtras";

export type TimeItem = {
  id: string;
  hours: number;
  note: string | null;
  date: number;
  userName: string | null;
};

function fmt(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function TimeTracking({
  projectId,
  entries,
  budgetHours,
}: {
  projectId: string;
  entries: TimeItem[];
  budgetHours: number | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useFormState<ExtrasState, FormData>(
    async (prev, fd) => {
      const r = await addTimeEntryAction(prev, fd);
      if (!r?.error) formRef.current?.reset();
      return r;
    },
    undefined
  );

  const logged = entries.reduce((sum, e) => sum + e.hours, 0);
  const pct =
    budgetHours && budgetHours > 0
      ? Math.min(100, Math.round((logged / budgetHours) * 100))
      : null;
  const over = budgetHours != null && logged > budgetHours;

  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Time & budget
        </h2>
        <span className="text-sm text-gray-600">
          {logged}h logged
          {budgetHours != null ? ` / ${budgetHours}h budget` : ""}
        </span>
      </div>

      {budgetHours != null ? (
        <div className="mb-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className={`h-full rounded-full ${over ? "bg-red-500" : "bg-brand-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className={`mt-1 text-xs ${over ? "text-red-600" : "text-gray-400"}`}>
            {over
              ? `Over budget by ${(logged - budgetHours).toFixed(1)}h`
              : `${pct}% of budget used`}
          </p>
        </div>
      ) : (
        <p className="mb-4 text-xs text-gray-400">
          Set a budget in the project’s Edit form to track burn.
        </p>
      )}

      {entries.length > 0 ? (
        <ul className="mb-4 divide-y divide-gray-100">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <div className="min-w-0">
                <span className="font-medium text-gray-800">{e.hours}h</span>
                <span className="ml-2 text-gray-500">{fmt(e.date)}</span>
                {e.userName ? (
                  <span className="ml-2 text-xs text-gray-400">{e.userName}</span>
                ) : null}
                {e.note ? (
                  <span className="ml-2 text-gray-500">— {e.note}</span>
                ) : null}
              </div>
              <form action={deleteTimeEntryAction}>
                <input type="hidden" name="id" value={e.id} />
                <button className="text-xs text-gray-400 hover:text-red-600">
                  Remove
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : null}

      <form ref={formRef} action={action} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="projectId" value={projectId} />
        <input
          name="hours"
          type="number"
          step="0.25"
          min="0"
          placeholder="Hours"
          className="input w-24"
          required
        />
        <input name="date" type="date" className="input w-40" />
        <input name="note" placeholder="Note (optional)" className="input flex-1" />
        <SubmitButton className="btn-secondary !py-1.5">Log time</SubmitButton>
      </form>
      {state?.error ? (
        <p className="mt-2 text-sm text-red-600">{state.error}</p>
      ) : null}
    </section>
  );
}
