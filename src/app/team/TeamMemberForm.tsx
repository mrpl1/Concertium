"use client";

import { useRef } from "react";
import { useFormState } from "react-dom";
import { createTeamMemberAction } from "@/app/actions/auth";
import { SubmitButton } from "@/components/SubmitButton";

export function TeamMemberForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useFormState(
    async (prev: { error?: string } | undefined, formData: FormData) => {
      const result = await createTeamMemberAction(prev, formData);
      if (!result?.error) formRef.current?.reset();
      return result;
    },
    undefined
  );

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">
            Name
          </label>
          <input id="name" name="name" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input id="email" name="email" type="email" required className="input" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="password">
            Temporary password
          </label>
          <input
            id="password"
            name="password"
            type="text"
            required
            minLength={8}
            className="input"
            placeholder="At least 8 characters"
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
      <SubmitButton className="btn-primary" pendingText="Adding…">
        Add team member
      </SubmitButton>
    </form>
  );
}
