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
            Email <span className="text-gray-400">(optional)</span>
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
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}
      <SubmitButton className="btn-hero" pendingText="Creating…">
        Create invite link
      </SubmitButton>
    </form>
  );
}
