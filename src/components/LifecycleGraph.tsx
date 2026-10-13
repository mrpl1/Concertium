import Link from "next/link";
import { LIFECYCLE_ZONES } from "@/lib/lifecycle";

export type LifecycleLane = {
  id: string;
  label: string;
  sublabel?: string;
  /** 0–100 position along the lifecycle. */
  progress: number;
  /** Hex color for the fill/marker. */
  color: string;
  /** Navigate here on click (used for projects). */
  href?: string;
  /** Drill-in handler (used for clients in the overview). */
  onSelect?: () => void;
  /** Render an "empty" lane (e.g. a client with no projects). */
  empty?: boolean;
  /** Optional badge text shown after the marker (e.g. status). */
  marker?: string;
};

// Subtle alternating quartile bands so the lifecycle "phases" read clearly.
const TRACK_BG =
  "linear-gradient(90deg, #f8fafc 0 25%, #eef2f7 25% 50%, #f8fafc 50% 75%, #eef2f7 75% 100%)";

export function LifecycleGraph({ lanes }: { lanes: LifecycleLane[] }) {
  return (
    <div>
      {/* Axis */}
      <div className="grid grid-cols-[120px_1fr] items-end gap-3 pb-2 sm:grid-cols-[160px_1fr]">
        <div />
        <div>
          <div className="flex justify-between text-xs font-medium text-[#ffffff]">
            {LIFECYCLE_ZONES.map((z) => (
              <span key={z.label}>{z.label}</span>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] tabular-nums text-[#ffffff]">
            {[0, 25, 50, 75, 100].map((t) => (
              <span key={t}>{t}%</span>
            ))}
          </div>
        </div>
      </div>

      {/* Lanes */}
      <div className="space-y-1">
        {lanes.length === 0 ? (
          <p className="py-6 text-center text-sm text-[#ffffff]">
            No projects to plot.
          </p>
        ) : (
          lanes.map((lane) => <LaneRow key={lane.id} lane={lane} />)
        )}
      </div>
    </div>
  );
}

function LaneRow({ lane }: { lane: LifecycleLane }) {
  const pos = Math.max(0, Math.min(100, lane.progress));
  const labelOnLeft = pos > 82;

  const inner = (
    <div className="grid grid-cols-[120px_1fr] items-center gap-3 rounded-[6px] px-2 py-1.5 -mx-2 transition-colors group-hover:bg-[#141414] sm:grid-cols-[160px_1fr]">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-[#ffffff] group-hover:text-brand-700">
          {lane.label}
        </div>
        {lane.sublabel ? (
          <div className="truncate text-xs text-[#ffffff]">{lane.sublabel}</div>
        ) : null}
      </div>

      <div
        className="relative h-7 rounded-[6px] ring-1 ring-inset ring-[#000000]"
        style={{ background: TRACK_BG }}
      >
        {lane.empty ? (
          <span className="absolute inset-0 grid place-items-center text-xs text-[#ffffff]">
            No projects yet
          </span>
        ) : (
          <>
            {/* progress fill */}
            <div
              className="absolute inset-y-1 left-1 rounded-[5px] transition-all duration-300"
              style={{
                width: `calc(${Math.max(pos, 1)}% - 4px)`,
                background: lane.color,
                opacity: 0.85,
              }}
            />
            {/* marker dot */}
            <div
              className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white shadow transition-all duration-300"
              style={{ left: `${pos}%`, background: lane.color }}
            />
            {/* percent label */}
            <span
              className="absolute top-1/2 -translate-y-1/2 text-[11px] font-semibold tabular-nums text-[#ffffff]"
              style={
                labelOnLeft
                  ? { left: `calc(${pos}% - 12px)`, transform: "translate(-100%, -50%)" }
                  : { left: `calc(${pos}% + 12px)` }
              }
            >
              {pos}%{lane.marker ? ` · ${lane.marker}` : ""}
            </span>
          </>
        )}
      </div>
    </div>
  );

  if (lane.href) {
    return (
      <Link href={lane.href} className="group block">
        {inner}
      </Link>
    );
  }
  if (lane.onSelect) {
    return (
      <button
        type="button"
        onClick={lane.onSelect}
        className="group block w-full text-left"
      >
        {inner}
      </button>
    );
  }
  return <div className="group block">{inner}</div>;
}
