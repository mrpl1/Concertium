"use client";

import { useEffect, useState } from "react";
import {
  generateShareLinkAction,
  revokeShareLinkAction,
} from "@/app/actions/clients";

export function ShareLink({
  clientId,
  token,
}: {
  clientId: string;
  token: string | null;
}) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => setOrigin(window.location.origin), []);

  const url = token ? `${origin}/share/${token}` : "";

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Client status link
          </h2>
          <p className="mt-0.5 text-xs text-gray-400">
            A read-only page the client can open — no login required.
          </p>
        </div>
        {token ? (
          <form action={revokeShareLinkAction}>
            <input type="hidden" name="id" value={clientId} />
            <button type="submit" className="text-xs font-medium text-gray-400 hover:text-red-600">
              Disable link
            </button>
          </form>
        ) : null}
      </div>

      {token ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input readOnly value={url} className="input flex-1 font-mono text-xs" />
          <button
            type="button"
            className="btn-secondary !py-1.5"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {
                /* ignore */
              }
            }}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
          <a href={url} target="_blank" rel="noreferrer" className="btn-secondary !py-1.5">
            Open
          </a>
        </div>
      ) : (
        <form action={generateShareLinkAction} className="mt-3">
          <input type="hidden" name="id" value={clientId} />
          <button type="submit" className="btn-secondary !py-1.5">
            Create share link
          </button>
        </form>
      )}
    </div>
  );
}
