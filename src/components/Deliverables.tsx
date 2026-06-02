"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/SubmitButton";
import { DELIVERABLE_STATUSES, deliverableBadgeClass } from "@/lib/constants";
import { slippageDays } from "@/lib/risk";
import {
  createDeliverableAction,
  updateDeliverableAction,
  setDeliverableStatusAction,
  deleteDeliverableAction,
  type DeliverableActionState,
} from "@/app/actions/deliverables";

export type DeliverableItem = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  ownerId: string | null;
  ownerName: string | null;
  dueDate: number | null;
  baselineDueDate: number | null;
  changeCount: number;
};

type UserOpt = { id: string; name: string };

function toInput(ms: number | null): string {
  if (!ms) return "";
  return new Date(ms).toISOString().slice(0, 10);
}
function fmt(ms: number | null): string {
  if (!ms) return "No due date";
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
const isDone = (s: string) => s === "Approved";

export function Deliverables({
  projectId,
  deliverables,
  users,
}: {
  projectId: string;
  deliverables: DeliverableItem[];
  users: UserOpt[];
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const approved = deliverables.filter((d) => d.status === "Approved").length;
  const total = deliverables.length;

  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Deliverables
          </h2>
          {total > 0 ? (
            <p className="mt-0.5 text-xs text-gray-400">
              {approved} of {total} approved
            </p>
          ) : null}
        </div>
        {!adding ? (
          <button
            type="button"
            onClick={() => {
              setAdding(true);
              setEditingId(null);
            }}
            className="btn-secondary !py-1.5"
          >
            + Add deliverable
          </button>
        ) : null}
      </div>

      {adding ? (
        <div className="mb-4 rounded-lg bg-gray-50 p-4 ring-1 ring-gray-200">
          <DeliverableForm
            projectId={projectId}
            users={users}
            onDone={() => setAdding(false)}
            mode="create"
          />
        </div>
      ) : null}

      {total === 0 && !adding ? (
        <p className="text-sm text-gray-500">
          No deliverables yet. Break this project into the concrete items you
          owe the client, each with its own owner and due date.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {deliverables.map((d) =>
            editingId === d.id ? (
              <li key={d.id} className="py-3">
                <div className="rounded-lg bg-gray-50 p-4 ring-1 ring-gray-200">
                  <DeliverableForm
                    projectId={projectId}
                    users={users}
                    deliverable={d}
                    onDone={() => setEditingId(null)}
                    mode="edit"
                  />
                </div>
              </li>
            ) : (
              <DeliverableRow
                key={d.id}
                d={d}
                onEdit={() => {
                  setEditingId(d.id);
                  setAdding(false);
                }}
              />
            )
          )}
        </ul>
      )}
    </section>
  );
}

function DeliverableRow({
  d,
  onEdit,
}: {
  d: DeliverableItem;
  onEdit: () => void;
}) {
  const now = Date.now();
  const overdue = !isDone(d.status) && d.dueDate != null && d.dueDate < now;
  const slip = slippageDays(d.baselineDueDate, d.dueDate);

  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`font-medium ${isDone(d.status) ? "text-gray-400 line-through" : "text-gray-900"}`}
          >
            {d.name}
          </span>
          {overdue ? (
            <span className="badge bg-red-100 text-red-800 ring-red-300">
              Overdue
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-xs text-gray-500">
          {d.ownerName ? `${d.ownerName} · ` : ""}
          <span className={overdue ? "font-medium text-red-600" : ""}>
            {fmt(d.dueDate)}
          </span>
          {slip > 0 ? (
            <span className="text-amber-600">
              {" "}
              · slipped {slip}d{d.changeCount > 1 ? ` (${d.changeCount}×)` : ""}
            </span>
          ) : null}
        </p>
      </div>

      {/* Inline status change */}
      <form action={setDeliverableStatusAction}>
        <input type="hidden" name="id" value={d.id} />
        <select
          name="status"
          defaultValue={d.status}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className={`badge cursor-pointer border-0 ${deliverableBadgeClass(d.status)}`}
          aria-label="Deliverable status"
        >
          {DELIVERABLE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </form>

      <button
        type="button"
        onClick={onEdit}
        className="text-xs font-medium text-brand-600 hover:underline"
      >
        Edit
      </button>
      <form action={deleteDeliverableAction}>
        <input type="hidden" name="id" value={d.id} />
        <button
          type="submit"
          className="text-xs font-medium text-gray-400 hover:text-red-600"
        >
          Delete
        </button>
      </form>
    </li>
  );
}

function DeliverableForm({
  projectId,
  users,
  deliverable,
  onDone,
  mode,
}: {
  projectId: string;
  users: UserOpt[];
  deliverable?: DeliverableItem;
  onDone: () => void;
  mode: "create" | "edit";
}) {
  const action = mode === "create" ? createDeliverableAction : updateDeliverableAction;
  const [state, formAction] = useFormState<DeliverableActionState, FormData>(
    async (prev, fd) => {
      const result = await action(prev, fd);
      if (!result?.error) onDone();
      return result;
    },
    undefined
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="projectId" value={projectId} />
      {deliverable ? (
        <input type="hidden" name="id" value={deliverable.id} />
      ) : null}
      <input
        name="name"
        required
        defaultValue={deliverable?.name ?? ""}
        className="input"
        placeholder="Deliverable name (e.g. Homepage design)"
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <select
          name="status"
          defaultValue={deliverable?.status ?? "Pending"}
          className="input"
        >
          {DELIVERABLE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          name="ownerId"
          defaultValue={deliverable?.ownerId ?? ""}
          className="input"
        >
          <option value="">Unassigned</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <input
          name="dueDate"
          type="date"
          defaultValue={toInput(deliverable?.dueDate ?? null)}
          className="input"
        />
      </div>
      {mode === "edit" ? (
        <input
          name="reason"
          className="input"
          placeholder="Reason for any date change (optional, logged for slippage history)"
        />
      ) : null}
      {state?.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}
      <div className="flex gap-2">
        <SubmitButton className="btn-primary !py-1.5">
          {mode === "create" ? "Add deliverable" : "Save"}
        </SubmitButton>
        <button type="button" onClick={onDone} className="btn-secondary !py-1.5">
          Cancel
        </button>
      </div>
    </form>
  );
}
