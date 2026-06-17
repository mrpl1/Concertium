"use client";

import { useState } from "react";
import { revokeInviteAction } from "@/app/actions/auth";

export type PendingInvite = {
  id: string;
  email: string | null;
  role: string;
  token: string;
  url: string;
  createdAt: number;
  expiresAt: number | null;
  expired: boolean;
};

export function InviteList({ invites }: { invites: PendingInvite[] }) {
  if (invites.length === 0) {
    return (
      <p className="px-5 py-6 text-sm text-gray-500">
        No pending invites. Create one above to add a teammate.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-gray-100">
      {invites.map((i) => (
        <InviteRow key={i.id} invite={i} />
      ))}
    </ul>
  );
}

function InviteRow({ invite }: { invite: PendingInvite }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(invite.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable; ignore.
    }
  };

  return (
    <li className="space-y-2 px-5 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-gray-900">
            {invite.email || "Anyone with the link"}
          </p>
          <p className="text-xs text-gray-400">
            {invite.role}
            {invite.expired ? " · expired" : ""}
          </p>
        </div>
        <form action={revokeInviteAction}>
          <input type="hidden" name="id" value={invite.id} />
          <button type="submit" className="btn-danger !py-1.5 text-xs">
            Revoke
          </button>
        </form>
      </div>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={invite.url}
          className="input flex-1 text-xs"
          onFocus={(e) => e.currentTarget.select()}
        />
        <button
          type="button"
          onClick={copy}
          className="btn-secondary !py-1.5 text-xs"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </li>
  );
}
