"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { StatusBadge, ProgressBar } from "@/components/Badge";
import { LifecycleGraph, type LifecycleLane } from "@/components/LifecycleGraph";
import { PROJECT_STATUSES, statusHex, statusBadgeClass } from "@/lib/constants";
import {
  aggregateHealth,
  averageProgress,
  effectiveProgress,
} from "@/lib/lifecycle";

export type DashClient = {
  id: string;
  name: string;
  company: string | null;
};

export type DashProject = {
  id: string;
  name: string;
  status: string;
  priority: string;
  progress: number;
  dueDate: number | null;
  updatedAt: number;
  clientId: string;
  clientName: string;
  ownerName: string | null;
};

function clientLabel(c: DashClient): string {
  return c.company || c.name;
}

function formatDate(ms: number | null): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function DashboardClient({
  firstName,
  clients,
  projects,
}: {
  firstName: string;
  clients: DashClient[];
  projects: DashProject[];
}) {
  const [selected, setSelected] = useState<string>("all"); // "all" | clientId
  const [showCompleted, setShowCompleted] = useState(true);

  const selectedClient =
    selected === "all" ? null : clients.find((c) => c.id === selected) ?? null;

  // Projects within the current scope.
  const scopedProjects = useMemo(
    () =>
      selected === "all"
        ? projects
        : projects.filter((p) => p.clientId === selected),
    [projects, selected]
  );

  // Build the lifecycle lanes depending on the view.
  const lanes: LifecycleLane[] = useMemo(() => {
    if (selected === "all") {
      // One lane per client, positioned at their overall progress.
      return clients.map((c) => {
        const cps = projects.filter((p) => p.clientId === c.id);
        const statuses = cps.map((p) => p.status);
        const health = aggregateHealth(statuses);
        return {
          id: c.id,
          label: clientLabel(c),
          sublabel: cps.length
            ? `${cps.length} project${cps.length === 1 ? "" : "s"} · ${health}`
            : "No projects",
          progress: averageProgress(cps),
          color: statusHex(health),
          onSelect: () => setSelected(c.id),
          empty: cps.length === 0,
        };
      });
    }
    // One lane per project for the selected client.
    return scopedProjects
      .filter((p) => (showCompleted ? true : p.status !== "Completed"))
      .slice()
      .sort((a, b) => effectiveProgress(a) - effectiveProgress(b))
      .map((p) => ({
        id: p.id,
        label: p.name,
        sublabel: p.ownerName ? `${p.ownerName}` : "Unassigned",
        progress: effectiveProgress(p),
        color: statusHex(p.status),
        href: `/projects/${p.id}`,
        marker: p.status,
      }));
  }, [selected, clients, projects, scopedProjects, showCompleted]);

  // Scope metrics.
  const metrics = useMemo(() => {
    const total = scopedProjects.length;
    const active = scopedProjects.filter((p) => p.status !== "Completed").length;
    const attention = scopedProjects.filter(
      (p) => p.status === "At Risk" || p.status === "Off Track"
    ).length;
    const completed = scopedProjects.filter(
      (p) => p.status === "Completed"
    ).length;
    const avg = averageProgress(scopedProjects);
    return { total, active, attention, completed, avg };
  }, [scopedProjects]);

  // Status distribution for the stacked bar.
  const distribution = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of PROJECT_STATUSES) counts[s] = 0;
    for (const p of scopedProjects) counts[p.status] = (counts[p.status] || 0) + 1;
    return counts;
  }, [scopedProjects]);

  const needsAttention = useMemo(
    () =>
      scopedProjects.filter(
        (p) => p.status === "At Risk" || p.status === "Off Track"
      ),
    [scopedProjects]
  );

  const upcoming = useMemo(() => {
    const now = Date.now();
    return scopedProjects
      .filter(
        (p) =>
          p.dueDate &&
          p.status !== "Completed" &&
          p.dueDate >= now - 1000 * 60 * 60 * 24
      )
      .sort((a, b) => (a.dueDate ?? 0) - (b.dueDate ?? 0))
      .slice(0, 6);
  }, [scopedProjects]);

  const recent = useMemo(
    () =>
      scopedProjects.slice().sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 6),
    [scopedProjects]
  );

  const reportHref =
    selected === "all" ? "/reports" : `/reports?clientId=${selected}`;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">
            {selectedClient
              ? `Viewing ${clientLabel(selectedClient)}`
              : `Welcome back, ${firstName}.`}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/projects/new" className="btn-primary">
            New project
          </Link>
          <Link href={reportHref} className="btn-secondary">
            Status report
          </Link>
        </div>
      </div>

      {/* Client selector */}
      <div className="flex flex-wrap gap-2">
        <SelectorPill
          label="All clients"
          active={selected === "all"}
          onClick={() => setSelected("all")}
        />
        {clients.map((c) => (
          <SelectorPill
            key={c.id}
            label={clientLabel(c)}
            active={selected === c.id}
            onClick={() => setSelected(c.id)}
          />
        ))}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Projects" value={metrics.total} />
        <Stat label="Active" value={metrics.active} />
        <Stat label="Need attention" value={metrics.attention} warn />
        <Stat label="Avg. progress" value={`${metrics.avg}%`} />
      </div>

      {/* Lifecycle graph */}
      <section className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Project lifecycle
            </h2>
            <p className="mt-0.5 text-xs text-gray-400">
              {selected === "all"
                ? "Where each client sits overall — click a client to drill in."
                : "Each project's position in the lifecycle — click to open it."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {selected !== "all" ? (
              <label className="flex items-center gap-1.5 text-xs text-gray-500">
                <input
                  type="checkbox"
                  checked={showCompleted}
                  onChange={(e) => setShowCompleted(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                Show completed
              </label>
            ) : null}
            {selected !== "all" ? (
              <button
                type="button"
                onClick={() => setSelected("all")}
                className="text-xs font-medium text-brand-600 hover:underline"
              >
                ← All clients
              </button>
            ) : null}
          </div>
        </div>

        <LifecycleGraph lanes={lanes} />

        {/* Legend */}
        <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-gray-100 pt-4">
          {PROJECT_STATUSES.map((s) => (
            <span key={s} className="flex items-center gap-1.5 text-xs text-gray-500">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: statusHex(s) }}
              />
              {s}
            </span>
          ))}
        </div>
      </section>

      {/* Status distribution */}
      <section className="card p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Status breakdown
        </h2>
        <StackedBar counts={distribution} total={metrics.total} />
        <div className="mt-3 flex flex-wrap gap-2">
          {PROJECT_STATUSES.map((s) =>
            distribution[s] > 0 ? (
              <Link
                key={s}
                href={`/projects?status=${encodeURIComponent(s)}${
                  selected !== "all" ? `&clientId=${selected}` : ""
                }`}
                className={`badge ${statusBadgeClass(s)} gap-1.5`}
              >
                {s}
                <span className="font-semibold">{distribution[s]}</span>
              </Link>
            ) : null
          )}
        </div>
      </section>

      {/* Attention + upcoming */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ListCard
          title="Needs attention"
          empty="Nothing at risk or off track. 🎉"
          items={needsAttention.map((p) => ({
            id: p.id,
            href: `/projects/${p.id}`,
            primary: p.name,
            secondary: p.clientName,
            right: <StatusBadge status={p.status} />,
          }))}
        />
        <ListCard
          title="Upcoming deadlines"
          empty="No upcoming due dates."
          items={upcoming.map((p) => ({
            id: p.id,
            href: `/projects/${p.id}`,
            primary: p.name,
            secondary: p.clientName,
            right: (
              <span className="whitespace-nowrap text-sm text-gray-600">
                {formatDate(p.dueDate)}
              </span>
            ),
          }))}
        />
      </div>

      {/* Recently updated */}
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Recently updated
          </h2>
          <Link href="/projects" className="text-sm font-medium text-brand-600">
            View all
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No projects in this view.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {recent.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/projects/${p.id}`}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-gray-900">
                      {p.name}
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      {p.clientName}
                    </p>
                  </div>
                  <div className="hidden w-40 sm:block">
                    <ProgressBar value={effectiveProgress(p)} />
                  </div>
                  <StatusBadge status={p.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function SelectorPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 ring-inset transition-colors ${
        active
          ? "bg-brand-600 text-white ring-brand-600"
          : "bg-white text-gray-600 ring-gray-300 hover:bg-gray-50"
      }`}
    >
      {label}
    </button>
  );
}

function Stat({
  label,
  value,
  warn,
}: {
  label: string;
  value: number | string;
  warn?: boolean;
}) {
  const isWarn = warn && typeof value === "number" && value > 0;
  return (
    <div className={`card p-4 ${isWarn ? "ring-2 ring-amber-300" : ""}`}>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function StackedBar({
  counts,
  total,
}: {
  counts: Record<string, number>;
  total: number;
}) {
  if (total === 0) {
    return (
      <div className="grid h-4 place-items-center rounded-full bg-gray-100 text-[10px] text-gray-400">
        No projects
      </div>
    );
  }
  return (
    <div className="flex h-4 w-full overflow-hidden rounded-full ring-1 ring-inset ring-gray-200">
      {PROJECT_STATUSES.map((s) =>
        counts[s] > 0 ? (
          <div
            key={s}
            title={`${s}: ${counts[s]}`}
            style={{
              width: `${(counts[s] / total) * 100}%`,
              background: statusHex(s),
            }}
          />
        ) : null
      )}
    </div>
  );
}

type ListItem = {
  id: string;
  href: string;
  primary: string;
  secondary: string;
  right: React.ReactNode;
};

function ListCard({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: ListItem[];
}) {
  return (
    <section className="card p-5">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">{empty}</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {items.map((it) => (
            <li key={it.id} className="py-3">
              <Link
                href={it.href}
                className="flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-900">
                    {it.primary}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {it.secondary}
                  </p>
                </div>
                {it.right}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
