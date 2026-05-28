"use client";

import { useState, useTransition } from "react";
import { aiDraftReply, aiSummarize } from "./ai-actions";

export default function AIPanel({
  locale,
  projectId,
  labels,
}: {
  locale: string;
  projectId: string;
  labels: {
    title: string;
    draftReply: string;
    summarize: string;
    loading: string;
    error: string;
    notConfigured: string;
    copy: string;
    copied: string;
  };
}) {
  const [pending, start] = useTransition();
  const [text, setText] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [heading, setHeading] = useState<string>("");
  const [copied, setCopied] = useState(false);

  function handle(label: string, fn: () => Promise<{ ok: boolean; data?: string; error?: string }>) {
    setError(null);
    setText("");
    setHeading(label);
    setCopied(false);
    start(async () => {
      const r = await fn();
      if (r.ok && r.data) setText(r.data);
      else
        setError(
          r.error === "openai_not_configured" ? labels.notConfigured : labels.error,
        );
    });
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold">{labels.title}</h3>
        <div className="flex gap-2 flex-wrap">
          <button
            disabled={pending}
            onClick={() =>
              handle(labels.draftReply, () =>
                aiDraftReply(locale, projectId).then((r) => ({
                  ok: r.ok,
                  data: r.ok ? r.data : undefined,
                  error: r.ok ? undefined : r.error,
                })),
              )
            }
            className="text-xs px-3 py-1.5 rounded border border-border hover:bg-accent disabled:opacity-60"
          >
            ✨ {labels.draftReply}
          </button>
          <button
            disabled={pending}
            onClick={() =>
              handle(labels.summarize, () =>
                aiSummarize(locale, projectId).then((r) => ({
                  ok: r.ok,
                  data: r.ok ? r.data : undefined,
                  error: r.ok ? undefined : r.error,
                })),
              )
            }
            className="text-xs px-3 py-1.5 rounded border border-border hover:bg-accent disabled:opacity-60"
          >
            ✨ {labels.summarize}
          </button>
        </div>
      </div>
      {pending && (
        <div className="text-sm text-muted-foreground">{labels.loading}</div>
      )}
      {error && <div className="text-sm text-red-700">{error}</div>}
      {text && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">{heading}</div>
          <textarea
            readOnly
            value={text}
            rows={Math.min(20, Math.max(5, text.split("\n").length + 1))}
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(text);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="text-xs px-3 py-1.5 rounded border border-border hover:bg-accent"
            >
              {copied ? labels.copied : labels.copy}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
