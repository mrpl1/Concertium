"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import {
  generateReportAction,
  sendReportAction,
  type GenerateState,
  type SendState,
} from "@/app/actions/reports";

type ClientOption = { id: string; name: string; company: string | null };

export function ReportBuilder({
  clients,
  initialClientId,
  emailConfigured,
}: {
  clients: ClientOption[];
  initialClientId: string;
  emailConfigured: boolean;
}) {
  const [clientId, setClientId] = useState(initialClientId);
  const [intro, setIntro] = useState("");
  const [to, setTo] = useState("");
  const [copied, setCopied] = useState(false);

  const [genState, generate] = useActionState<GenerateState, FormData>(
    generateReportAction,
    undefined
  );
  const [sendState, send] = useActionState<SendState, FormData>(
    sendReportAction,
    undefined
  );

  const report = genState?.ok ? genState.report : null;

  // Prefill recipient with the client's email when a report is generated.
  useEffect(() => {
    if (genState?.ok && genState.suggestedTo) {
      setTo(genState.suggestedTo);
    }
  }, [genState]);

  function mailtoHref(): string {
    if (!report) return "#";
    const params = new URLSearchParams();
    params.set("subject", report.subject);
    params.set("body", report.text);
    return `mailto:${encodeURIComponent(to)}?${params.toString()}`;
  }

  async function copyReport() {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(
        `Subject: ${report.subject}\n\n${report.text}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard not available */
    }
  }

  return (
    <div className="space-y-6">
      {/* Step 1: build */}
      <form action={generate} className="card space-y-4 p-6">
        <div>
          <label className="label" htmlFor="clientId">
            Report scope
          </label>
          <select
            id="clientId"
            name="clientId"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="input"
          >
            <option value="all">All clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company ? `${c.company} (${c.name})` : c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="intro">
            Intro / summary note (optional)
          </label>
          <textarea
            id="intro"
            name="intro"
            rows={3}
            value={intro}
            onChange={(e) => setIntro(e.target.value)}
            className="input"
            placeholder="A short message to open the report…"
          />
        </div>
        <SubmitButton className="btn-primary" pendingText="Generating…">
          Generate report
        </SubmitButton>
        {genState && !genState.ok ? (
          <p className="text-sm text-red-600">{genState.error}</p>
        ) : null}
      </form>

      {/* Step 2: preview + delivery */}
      {report ? (
        <div className="card space-y-5 p-6">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Preview
            </h2>
            <p className="mt-2 text-sm font-medium text-gray-900">
              {report.subject}
            </p>
            <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-gray-50 p-4 text-sm text-gray-700 ring-1 ring-gray-200">
              {report.text}
            </pre>
          </div>

          <div className="space-y-3 border-t border-gray-100 pt-5">
            <label className="label" htmlFor="to">
              Recipient email
            </label>
            <input
              id="to"
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="input"
              placeholder="client@company.com"
            />

            <div className="flex flex-wrap gap-2">
              <a href={mailtoHref()} className="btn-secondary">
                Open draft in mail client
              </a>
              <button
                type="button"
                onClick={copyReport}
                className="btn-secondary"
              >
                {copied ? "Copied!" : "Copy report"}
              </button>

              {/* Automatic send */}
              <form action={send} className="contents">
                <input type="hidden" name="clientId" value={clientId} />
                <input type="hidden" name="intro" value={intro} />
                <input type="hidden" name="to" value={to} />
                <SubmitButton
                  className="btn-primary"
                  pendingText="Sending…"
                >
                  {emailConfigured
                    ? "Send automatically"
                    : "Send automatically (needs setup)"}
                </SubmitButton>
              </form>
            </div>

            {!emailConfigured ? (
              <p className="text-xs text-gray-500">
                Automatic sending isn&apos;t configured yet. Use “Open draft in
                mail client” for now, or add SMTP settings to your{" "}
                <code>.env</code> to enable one-click sending.
              </p>
            ) : null}

            {sendState && sendState.ok ? (
              <p className="text-sm text-green-600">{sendState.message}</p>
            ) : null}
            {sendState && !sendState.ok ? (
              <p className="text-sm text-red-600">{sendState.error}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
