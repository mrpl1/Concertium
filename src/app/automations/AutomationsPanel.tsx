"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import {
  runAlertsNowAction,
  runWeeklyReportsNowAction,
  type AutomationState,
} from "@/app/actions/automations";

function Result({ state }: { state: AutomationState }) {
  if (!state) return null;
  if (state.error) return <p className="mt-2 text-sm text-red-600">{state.error}</p>;
  return <p className="mt-2 text-sm text-green-600">{state.ok}</p>;
}

export function AutomationsPanel() {
  const [alertState, runAlerts] = useActionState<AutomationState, FormData>(
    () => runAlertsNowAction(),
    undefined
  );
  const [weeklyState, runWeekly] = useActionState<AutomationState, FormData>(
    () => runWeeklyReportsNowAction(),
    undefined
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="card p-5">
        <h3 className="font-medium text-gray-900">Alert digest</h3>
        <p className="mt-1 text-sm text-gray-500">
          Send the current overdue / at-risk / due-soon digest now via email and
          Slack.
        </p>
        <form action={runAlerts} className="mt-3">
          <SubmitButton className="btn-primary !py-1.5" pendingText="Sending…">
            Send alert digest now
          </SubmitButton>
        </form>
        <Result state={alertState} />
      </div>

      <div className="card p-5">
        <h3 className="font-medium text-gray-900">Weekly client reports</h3>
        <p className="mt-1 text-sm text-gray-500">
          Email a status report to every client opted in (Clients → Edit →
          “Weekly report”).
        </p>
        <form action={runWeekly} className="mt-3">
          <SubmitButton className="btn-primary !py-1.5" pendingText="Sending…">
            Send weekly reports now
          </SubmitButton>
        </form>
        <Result state={weeklyState} />
      </div>
    </div>
  );
}
