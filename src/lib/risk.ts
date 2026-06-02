// Derived "health"/risk signals for a project, computed from its deadlines,
// progress, deliverables, and recency of updates. Pure functions — usable on
// the server or client. This *augments* the manually-set status; it never
// overwrites it, but surfaces objective reasons a project needs attention.

const DAY = 1000 * 60 * 60 * 24;

export type RiskInputs = {
  status: string;
  progress: number;
  dueDate: number | null; // epoch ms
  lastUpdateAt: number | null; // epoch ms of most recent status update
  deliverables: {
    status: string;
    dueDate: number | null;
  }[];
};

export type RiskLevel = "none" | "watch" | "at-risk" | "overdue";

export type RiskResult = {
  level: RiskLevel;
  reasons: string[];
  overdueDeliverables: number;
  // Completion derived from approved deliverables (null when there are none).
  deliverableCompletion: number | null;
  approved: number;
  totalDeliverables: number;
};

const isDone = (status: string) =>
  status === "Completed" || status === "Approved";

export function computeRisk(p: RiskInputs, now = Date.now()): RiskResult {
  const reasons: string[] = [];
  let level: RiskLevel = "none";
  const bump = (l: RiskLevel) => {
    const order: RiskLevel[] = ["none", "watch", "at-risk", "overdue"];
    if (order.indexOf(l) > order.indexOf(level)) level = l;
  };

  const done = p.status === "Completed";

  // Overdue deliverables.
  const overdueDeliverables = p.deliverables.filter(
    (d) => !isDone(d.status) && d.dueDate != null && d.dueDate < now
  ).length;
  if (overdueDeliverables > 0) {
    bump("overdue");
    reasons.push(
      `${overdueDeliverables} overdue deliverable${overdueDeliverables === 1 ? "" : "s"}`
    );
  }

  // Project past its due date.
  if (!done && p.dueDate != null && p.dueDate < now) {
    bump("overdue");
    const days = Math.floor((now - p.dueDate) / DAY);
    reasons.push(`Due date passed${days > 0 ? ` ${days}d ago` : ""}`);
  }

  // Blocked deliverables.
  const blocked = p.deliverables.filter((d) => d.status === "Blocked").length;
  if (blocked > 0) {
    bump("at-risk");
    reasons.push(`${blocked} blocked deliverable${blocked === 1 ? "" : "s"}`);
  }

  // Manual status signal.
  if (p.status === "Off Track") {
    bump("at-risk");
    reasons.push("Marked Off Track");
  } else if (p.status === "At Risk") {
    bump("watch");
    reasons.push("Marked At Risk");
  }

  // Due soon but low progress.
  if (!done && p.dueDate != null) {
    const daysLeft = Math.ceil((p.dueDate - now) / DAY);
    if (daysLeft >= 0 && daysLeft <= 7 && p.progress < 80) {
      bump("at-risk");
      reasons.push(`Due in ${daysLeft}d but ${p.progress}% complete`);
    }
  }

  // Stale — no update in 14+ days on an active project.
  if (!done && p.status !== "Not Started" && p.lastUpdateAt != null) {
    const daysSince = Math.floor((now - p.lastUpdateAt) / DAY);
    if (daysSince >= 14) {
      bump("watch");
      reasons.push(`No update in ${daysSince}d`);
    }
  }

  const totalDeliverables = p.deliverables.length;
  const approved = p.deliverables.filter((d) => d.status === "Approved").length;
  const deliverableCompletion =
    totalDeliverables > 0
      ? Math.round((approved / totalDeliverables) * 100)
      : null;

  return {
    level,
    reasons,
    overdueDeliverables,
    deliverableCompletion,
    approved,
    totalDeliverables,
  };
}

/** Days a due date has slipped past its baseline (0 if not slipped). */
export function slippageDays(
  baseline: number | null,
  current: number | null
): number {
  if (baseline == null || current == null) return 0;
  const d = Math.round((current - baseline) / DAY);
  return d > 0 ? d : 0;
}

export const RISK_STYLES: Record<RiskLevel, string> = {
  none: "bg-gray-100 text-gray-600 ring-gray-300",
  watch: "bg-amber-100 text-amber-800 ring-amber-300",
  "at-risk": "bg-orange-100 text-orange-800 ring-orange-300",
  overdue: "bg-red-100 text-red-800 ring-red-300",
};

export const RISK_LABELS: Record<RiskLevel, string> = {
  none: "On track",
  watch: "Watch",
  "at-risk": "At risk",
  overdue: "Overdue",
};
