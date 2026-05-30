"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  sendClientReplyAction,
  type ClientReplyState,
} from "./reply-actions";

type Labels = {
  placeholder: string;
  send: string;
  sending: string;
  error: string;
};

export default function ClientReplyForm({
  locale,
  projectId,
  labels,
}: {
  locale: string;
  projectId: string;
  labels: Labels;
}) {
  const action = sendClientReplyAction.bind(null, locale);
  const [state, formAction, pending] = useActionState<ClientReplyState, FormData>(
    action,
    { ok: false },
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <input type="hidden" name="projectId" value={projectId} />
      <textarea
        name="body"
        required
        rows={4}
        placeholder={labels.placeholder}
        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
      />
      {!state.ok && state.error && (
        <p className="text-sm text-destructive">{labels.error}</p>
      )}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60 transition"
        >
          {pending ? labels.sending : labels.send}
        </button>
      </div>
    </form>
  );
}
