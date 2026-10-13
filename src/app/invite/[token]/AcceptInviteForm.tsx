"use client";

import { useActionState } from "react";
import { acceptInviteAction } from "@/app/actions/auth";
import { SubmitButton } from "@/components/SubmitButton";

export function AcceptInviteForm({
  token,
  email,
}: {
  token: string;
  email: string | null;
}) {
  const action = acceptInviteAction.bind(null, token);
  const [state, formAction] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="name">
          Name
        </label>
        <input
          id="name"
          name="name"
          required
          className="input"
          placeholder="Your name"
        />
      </div>
      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={email ?? ""}
          readOnly={Boolean(email)}
          className="input"
          placeholder="you@company.com"
        />
      </div>
      <div>
        <label className="label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="input"
          placeholder="At least 8 characters"
        />
      </div>
      {state?.error ? (
        <p className="text-sm text-[#0066cc]">{state.error}</p>
      ) : null}
      <SubmitButton className="w-full rounded-full bg-gradient-to-r from-[var(--vibemaxx-primary)] to-[var(--vibemaxx-accent)] px-8 py-3.5 font-bold text-white shadow-lg shadow-[var(--vibemaxx-primary)]/30 transition-all duration-300 hover:scale-105 hover:shadow-[var(--vibemaxx-accent)]/50" pendingText="Joining…">
        Join workspace
      </SubmitButton>
    </form>
  );
}
