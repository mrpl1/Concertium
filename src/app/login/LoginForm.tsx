"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions/auth";
import { SubmitButton } from "@/components/SubmitButton";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState(loginAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
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
          autoComplete="current-password"
          required
          className="input"
          placeholder="••••••••"
        />
      </div>
      {state?.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}
      <SubmitButton className="btn-primary w-full" pendingText="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}
