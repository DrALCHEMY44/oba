"use client";

import { useActionState, type ReactNode } from "react";
import type { ActionState } from "@/app/[locale]/admin/actions";

export function AdminForm({
  action,
  children,
  submit,
  errorText,
  successText,
  confirmText,
}: {
  action: (state: ActionState, data: FormData) => Promise<ActionState>;
  children: ReactNode;
  submit: string;
  errorText?: string;
  successText?: string;
  confirmText?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (confirmText && !window.confirm(confirmText)) event.preventDefault();
      }}
      className="space-y-3 rounded-xl border border-border bg-card p-4 sm:p-5"
    >
      {children}
      <button type="submit" disabled={pending} className="action-button">
        {pending ? "…" : submit}
      </button>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {errorText ?? state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-sm text-primary">
          {successText ?? "Saved."}
        </p>
      )}
    </form>
  );
}
