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
        <p className="mt-1 text-xs text-[#ffffff]">
          The daily alert digest for this workspace posts here. Leave blank to
          disable Slack.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm text-[#ffffff]">
        <input
          type="checkbox"
          name="weeklyReportEnabled"
          defaultChecked={weeklyReportEnabled}
          className="h-4 w-4 rounded-[6px] border-[#000000]"
        />
        Send weekly client reports for this workspace
      </label>

      {state?.error ? (
        <p className="text-sm text-[#0066cc]">{state.error}</p>
      ) : null}
      {state?.ok ? (
        <p className="text-sm text-[#e8e8ed]">{state.ok}</p>
      ) : null}

      <SubmitButton className="rounded-full bg-gradient-to-r from-[var(--vibemaxx-primary)] to-[var(--vibemaxx-accent)] px-8 py-3.5 font-bold text-white shadow-lg shadow-[var(--vibemaxx-primary)]/30 transition-all duration-300 hover:scale-105 hover:shadow-[var(--vibemaxx-accent)]/50" pendingText="Saving…">
        Save settings
      </SubmitButton>
    </form>
  );
}
