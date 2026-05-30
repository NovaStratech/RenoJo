"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { aiReviseText } from "@/app/[locale]/(admin)/admin/projets/[id]/ai-actions";
import type { ReviseKind } from "@/lib/ai/drafts";

interface Props {
  locale: string;
  text: string;
  kind: ReviseKind;
  onAccept: (revised: string) => void;
  /** Label override. Defaults to "Réviser" / "Revise". */
  label?: string;
}

const COPY: Record<string, { revise: string; loading: string; preview: string; accept: string; cancel: string; before: string; after: string; empty: string; error: string }> = {
  fr: {
    revise: "Réviser avec l'IA",
    loading: "Révision…",
    preview: "Suggestion de l'IA",
    accept: "Accepter",
    cancel: "Annuler",
    before: "Avant",
    after: "Après",
    empty: "Aucun texte à réviser.",
    error: "Erreur",
  },
  en: {
    revise: "Revise with AI",
    loading: "Revising…",
    preview: "AI suggestion",
    accept: "Accept",
    cancel: "Cancel",
    before: "Before",
    after: "After",
    empty: "Nothing to revise.",
    error: "Error",
  },
};

export function AIReviseButton({ locale, text, kind, onAccept, label }: Props) {
  const t = COPY[locale === "en" ? "en" : "fr"];
  const [isPending, startTransition] = useTransition();
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run() {
    setError(null);
    if (!text || !text.trim()) {
      setError(t.empty);
      return;
    }
    startTransition(async () => {
      const res = await aiReviseText(locale, text, kind);
      if (res.ok) setSuggestion(res.data);
      else setError(`${t.error}: ${res.error}`);
    });
  }

  function accept() {
    if (suggestion) onAccept(suggestion);
    setSuggestion(null);
  }

  return (
    <div className="inline-flex flex-col gap-2 w-full">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={run}
          disabled={isPending}
          title={label ?? t.revise}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l1.9 5.8L20 10l-5.1 3 1.9 6-4.8-3.6L7.2 19l1.9-6L4 10l6.1-1.2z" />
          </svg>
          {isPending ? t.loading : (label ?? t.revise)}
        </Button>
        {error ? <span className="text-xs text-destructive">{error}</span> : null}
      </div>

      {suggestion ? (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2 text-sm">
          <div className="text-xs font-medium text-primary">{t.preview}</div>
          <div className="whitespace-pre-wrap text-foreground">{suggestion}</div>
          <div className="flex gap-2 pt-1">
            <Button type="button" size="sm" onClick={accept}>{t.accept}</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setSuggestion(null)}>{t.cancel}</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
