"use client";

import { useFormState } from "react-dom";
import Link from "next/link";
import { SubmitButton } from "@/components/SubmitButton";
import { PROJECT_STATUSES, PRIORITIES } from "@/lib/constants";
import type { ProjectActionState } from "@/app/actions/projects";

type Defaults = {
  name?: string;
  description?: string | null;
  status?: string;
  priority?: string;
  progress?: number;
  startDate?: Date | string | null;
  dueDate?: Date | string | null;
  clientId?: string;
  ownerId?: string | null;
  budgetHours?: number | null;
};

function toDateInput(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function ProjectForm({
  action,
  clients,
  users,
  defaults,
  tagsDefault,
  submitLabel,
  cancelHref,
}: {
  action: (
    prev: ProjectActionState,
    formData: FormData
  ) => Promise<ProjectActionState>;
  clients: { id: string; name: string; company: string | null }[];
  users: { id: string; name: string }[];
  defaults?: Defaults;
  tagsDefault?: string;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction] = useFormState(action, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="name">
          Project name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={defaults?.name ?? ""}
          className="input"
          placeholder="Website Redesign"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="clientId">
            Client <span className="text-red-500">*</span>
          </label>
          <select
            id="clientId"
            name="clientId"
            required
            defaultValue={defaults?.clientId ?? ""}
            className="input"
          >
            <option value="" disabled>
              Choose a client…
            </option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company ? `${c.company} (${c.name})` : c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="ownerId">
            Owner
          </label>
          <select
            id="ownerId"
            name="ownerId"
            defaultValue={defaults?.ownerId ?? ""}
            className="input"
          >
            <option value="">Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="status">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={defaults?.status ?? "Not Started"}
            className="input"
          >
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="priority">
            Priority
          </label>
          <select
            id="priority"
            name="priority"
            defaultValue={defaults?.priority ?? "Medium"}
            className="input"
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="progress">
            Progress (%)
          </label>
          <input
            id="progress"
            name="progress"
            type="number"
            min={0}
            max={100}
            defaultValue={defaults?.progress ?? 0}
            className="input"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="startDate">
            Start date
          </label>
          <input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={toDateInput(defaults?.startDate)}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="dueDate">
            Due date
          </label>
          <input
            id="dueDate"
            name="dueDate"
            type="date"
            defaultValue={toDateInput(defaults?.dueDate)}
            className="input"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="tags">
            Tags
          </label>
          <input
            id="tags"
            name="tags"
            defaultValue={tagsDefault ?? ""}
            className="input"
            placeholder="comma, separated, tags"
          />
        </div>
        <div>
          <label className="label" htmlFor="budgetHours">
            Budget (hours)
          </label>
          <input
            id="budgetHours"
            name="budgetHours"
            type="number"
            min={0}
            step="0.5"
            defaultValue={defaults?.budgetHours ?? ""}
            className="input"
            placeholder="e.g. 80"
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="description">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={defaults?.description ?? ""}
          className="input"
          placeholder="What is this project about?"
        />
      </div>

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
