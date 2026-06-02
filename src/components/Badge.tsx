import { statusBadgeClass, priorityBadgeClass } from "@/lib/constants";

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${statusBadgeClass(status)}`}>{status}</span>;
}

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={`badge ${priorityBadgeClass(priority)}`}>{priority}</span>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-brand-500"
          style={{ width: `${v}%` }}
        />
      </div>
      <span className="w-9 text-right text-xs tabular-nums text-gray-500">
        {v}%
      </span>
    </div>
  );
}
