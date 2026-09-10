"use client";

import { useActionState } from "react";
import { updateWorkspaceSettingsAction } from "@/app/actions/workspace";
import { SubmitButton } from "@/components/SubmitButton";

export function SettingsForm({
  slackWebhookUrl,
  weeklyReportEnabled,
}: {
  slackWebhookUrl: string;
  weeklyReportEnabled: boolean;
}) {
  const [state, formAction] = useActionState(
    updateWorkspaceSettingsAction,
    undefined
  );

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label className="label" htmlFor="slackWebhookUrl">
          Slack Incoming Webhook URL
        </label>
        <input
          id="slackWebhookUrl"
          name="slackWebhookUrl"
          type="url"
          defaultValue={slackWebhookUrl}
          className="input"
          placeholder="https://hooks.slack.com/services/…"
        />
        <p className="mt-1 text-xs text-gray-500">
          The daily alert digest for this workspace posts here. Leave blank to
          disable Slack.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          name="weeklyReportEnabled"
          defaultChecked={weeklyReportEnabled}
          className="h-4 w-4 rounded-md border-gray-300"
        />
        Send weekly client reports for this workspace
      </label>

      {state?.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}
      {state?.ok ? (
        <p className="text-sm text-green-600">{state.ok}</p>
      ) : null}

      <SubmitButton className="btn-hero" pendingText="Saving…">
        Save settings
      </SubmitButton>
    </form>
  );
}
