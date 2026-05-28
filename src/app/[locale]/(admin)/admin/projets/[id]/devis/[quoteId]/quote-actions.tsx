"use client";

import { useTransition } from "react";
import { sendQuote, deleteQuote, convertQuoteToInvoice } from "../actions";

export default function QuoteActions({
  locale,
  projectId,
  quoteId,
  status,
  labels,
}: {
  locale: string;
  projectId: string;
  quoteId: string;
  status: string;
  labels: {
    send: string;
    sending: string;
    sent: string;
    convert: string;
    delete: string;
    confirmDelete: string;
  };
}) {
  const [pending, start] = useTransition();
  const canSend = status === "draft";
  const canConvert = status === "accepted";
  const canDelete = status === "draft";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canSend && (
        <button
          disabled={pending}
          onClick={() =>
            start(async () => {
              await sendQuote(locale, projectId, quoteId);
            })
          }
          className="text-sm px-3 py-1.5 rounded bg-primary text-primary-foreground font-medium disabled:opacity-60"
        >
          {pending ? labels.sending : labels.send}
        </button>
      )}
      {!canSend && status !== "accepted" && (
        <span className="text-xs text-muted-foreground">{labels.sent}</span>
      )}
      {canConvert && (
        <button
          disabled={pending}
          onClick={() =>
            start(async () => {
              await convertQuoteToInvoice(locale, projectId, quoteId);
            })
          }
          className="text-sm px-3 py-1.5 rounded border border-border hover:bg-accent disabled:opacity-60"
        >
          {labels.convert}
        </button>
      )}
      {canDelete && (
        <button
          disabled={pending}
          onClick={() => {
            if (!confirm(labels.confirmDelete)) return;
            start(async () => {
              await deleteQuote(locale, projectId, quoteId);
            });
          }}
          className="text-sm px-3 py-1.5 rounded border border-border text-red-700 hover:bg-red-50 disabled:opacity-60"
        >
          {labels.delete}
        </button>
      )}
    </div>
  );
}
