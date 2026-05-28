"use client";

import { useActionState, useRef, useEffect } from "react";
import { sendReplyAction, type SendReplyState } from "./reply-actions";

const initial: SendReplyState = { ok: false };

export default function ReplyForm({
  locale,
  projectId,
  labels,
}: {
  locale: string;
  projectId: string;
  labels: {
    title: string;
    placeholder: string;
    send: string;
    sent: string;
    skipped: string;
    error: string;
  };
}) {
  const action = sendReplyAction.bind(null, locale);
  const [state, formAction, pending] = useActionState(action, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok && formRef.current) formRef.current.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-lg border border-border bg-card p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{labels.title}</h3>
      </div>
      <input type="hidden" name="projectId" value={projectId} />
      <textarea
        name="body"
        required
        rows={5}
        placeholder={labels.placeholder}
        className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
      />
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground min-h-[1.25rem]">
          {state.ok && state.skipped && labels.skipped}
          {state.ok && !state.skipped && labels.sent}
          {!state.ok && state.error && labels.error}
        </div>
        <button
          type="submit"
          disabled={pending}
          className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60"
        >
          {pending ? "…" : labels.send}
        </button>
      </div>
    </form>
  );
}
