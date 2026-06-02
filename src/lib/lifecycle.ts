// Helpers for the project-lifecycle visualization.
// Pure functions — safe to use on the server or client.

export type LifecycleProject = {
  status: string;
  progress: number;
};

/**
 * A project's effective position in the lifecycle as a 0–100 number.
 * Completed projects sit at 100 regardless of the stored progress value.
 */
export function effectiveProgress(p: LifecycleProject): number {
  if (p.status === "Completed") return 100;
  return Math.max(0, Math.min(100, Math.round(p.progress)));
}

/** Average lifecycle position across a set of projects (0–100). */
export function averageProgress(projects: LifecycleProject[]): number {
  if (projects.length === 0) return 0;
  const sum = projects.reduce((acc, p) => acc + effectiveProgress(p), 0);
  return Math.round(sum / projects.length);
}

/**
 * Roll a set of project statuses up into a single "health" status for a client,
 * worst-first so problems are never hidden.
 */
export function aggregateHealth(statuses: string[]): string {
  if (statuses.length === 0) return "Not Started";
  if (statuses.includes("Off Track")) return "Off Track";
  if (statuses.includes("At Risk")) return "At Risk";
  if (statuses.includes("On Hold")) return "On Hold";
  if (statuses.includes("On Track")) return "On Track";
  if (statuses.every((s) => s === "Completed")) return "Completed";
  if (statuses.every((s) => s === "Not Started")) return "Not Started";
  return "On Track";
}

/** The three named zones shown along the lifecycle axis. */
export const LIFECYCLE_ZONES = [
  { label: "Not Started", align: "start" as const },
  { label: "In Progress", align: "center" as const },
  { label: "Completed", align: "end" as const },
];
