// Shared domain constants used across the UI and reports.

export const PROJECT_STATUSES = [
  "Not Started",
  "On Track",
  "At Risk",
  "Off Track",
  "On Hold",
  "Completed",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PRIORITIES = ["Low", "Medium", "High"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const DELIVERABLE_STATUSES = [
  "Pending",
  "In Progress",
  "In Review",
  "Approved",
  "Blocked",
] as const;
export type DeliverableStatus = (typeof DELIVERABLE_STATUSES)[number];

export const DELIVERABLE_STATUS_STYLES: Record<string, string> = {
  Pending: "bg-gray-100 text-gray-700 ring-gray-300",
  "In Progress": "bg-brand-100 text-brand-700 ring-brand-300",
  "In Review": "bg-amber-100 text-amber-800 ring-amber-300",
  Approved: "bg-emerald-100 text-emerald-800 ring-emerald-300",
  Blocked: "bg-red-100 text-red-800 ring-red-300",
};

export function deliverableBadgeClass(status: string): string {
  return DELIVERABLE_STATUS_STYLES[status] ?? DELIVERABLE_STATUS_STYLES.Pending;
}

// Tailwind classes for status badges.
export const STATUS_STYLES: Record<string, string> = {
  "Not Started": "bg-gray-100 text-gray-700 ring-gray-300",
  "On Track": "bg-green-100 text-green-800 ring-green-300",
  "At Risk": "bg-amber-100 text-amber-800 ring-amber-300",
  "Off Track": "bg-red-100 text-red-800 ring-red-300",
  "On Hold": "bg-blue-100 text-blue-800 ring-blue-300",
  Completed: "bg-emerald-100 text-emerald-800 ring-emerald-300",
};

export const PRIORITY_STYLES: Record<string, string> = {
  Low: "bg-gray-100 text-gray-600 ring-gray-300",
  Medium: "bg-indigo-100 text-indigo-700 ring-indigo-300",
  High: "bg-rose-100 text-rose-700 ring-rose-300",
};

// Hex colors for status (used by the lifecycle graph / charts).
export const STATUS_HEX: Record<string, string> = {
  "Not Started": "#9ca3af", // gray-400
  "On Track": "#22c55e", // green-500
  "At Risk": "#f59e0b", // amber-500
  "Off Track": "#ef4444", // red-500
  "On Hold": "#3b82f6", // blue-500
  Completed: "#10b981", // emerald-500
};

export function statusHex(status: string): string {
  return STATUS_HEX[status] ?? STATUS_HEX["Not Started"];
}

export function statusBadgeClass(status: string): string {
  return STATUS_STYLES[status] ?? STATUS_STYLES["Not Started"];
}

export function priorityBadgeClass(priority: string): string {
  return PRIORITY_STYLES[priority] ?? PRIORITY_STYLES["Medium"];
}
