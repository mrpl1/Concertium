"use client";

import { useFormState } from "react-dom";
import { registerAction } from "@/app/actions/auth";
import { SubmitButton } from "@/components/SubmitButton";

export function RegisterForm() {
  const [state, formAction] = useFormState(registerAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="name">
          Name
        </label>
        <input id="name" name="name" required className="input" placeholder="Your name" />
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
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}
      <SubmitButton className="btn-primary w-full" pendingText="Creating…">
        Create account
      </SubmitButton>
    </form>
  );
}
