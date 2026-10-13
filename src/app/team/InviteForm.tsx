"use client";

import { useRef } from "react";
import { useActionState } from "react";
import { createInviteAction } from "@/app/actions/auth";
import { SubmitButton } from "@/components/SubmitButton";

export function InviteForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(
    async (prev: { error?: string } | undefined, formData: FormData) => {
      const result = await createInviteAction(prev, formData);
      if (!result?.error) formRef.current?.reset();
      return result;
    },
    undefined
  );

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="email">
            Email <span className="text-[#ffffff]">(optional)</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className="input"
            placeholder="teammate@company.com"
          />
        </div>
        <div>
          <label className="label" htmlFor="role">
            Role
          </label>
          <select id="role" name="role" defaultValue="member" className="input">
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>
      {state?.error ? (
        <p className="text-sm text-[#0066cc]">{state.error}</p>
      ) : null}
      <SubmitButton className="rounded-full bg-gradient-to-r from-[var(--vibemaxx-primary)] to-[var(--vibemaxx-accent)] px-8 py-3.5 font-bold text-white shadow-lg shadow-[var(--vibemaxx-primary)]/30 transition-all duration-300 hover:scale-105 hover:shadow-[var(--vibemaxx-accent)]/50" pendingText="Creating…">
        Create invite link
      </SubmitButton>
    </form>
  );
}
