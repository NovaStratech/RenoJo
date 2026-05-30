"use client";

import { useActionState, useRef, useState } from "react";
import {
  acceptQuotePortalAction,
  declineQuotePortalAction,
  type AcceptQuoteResult,
} from "./quote-actions";

const initial: AcceptQuoteResult = { ok: false, error: "" };

export default function PortalQuoteActions({
  locale,
  projectId,
  quoteId,
  quoteNumber,
  labels,
}: {
  locale: string;
  projectId: string;
  quoteId: string;
  quoteNumber: string;
  labels: {
    title: string;
    namePlaceholder: string;
    signaturePrompt: string;
    clearSig: string;
    accept: string;
    accepted: string;
    decline: string;
    confirmDecline: string;
    error: string;
  };
}) {
  const action = acceptQuotePortalAction.bind(null, locale);
  const [state, formAction, pending] = useActionState(action, initial);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasSig, setHasSig] = useState(false);
  const drawing = useRef(false);

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvasRef.current;
    if (!c) return;
    drawing.current = true;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 1.8;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111";
    const r = c.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - r.left, e.clientY - r.top);
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const r = c.getBoundingClientRect();
    ctx.lineTo(e.clientX - r.left, e.clientY - r.top);
    ctx.stroke();
    if (!hasSig) setHasSig(true);
  }
  function end() {
    drawing.current = false;
  }
  function clear() {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    setHasSig(false);
  }

  if (state.ok) {
    return (
      <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm">
        {labels.accepted}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <h3 className="font-semibold">{labels.title}</h3>
      <form
        action={(fd) => {
          const c = canvasRef.current;
          if (c && hasSig) {
            fd.set("signatureDataUrl", c.toDataURL("image/png"));
          }
          fd.set("projectId", projectId);
          fd.set("quoteId", quoteId);
          formAction(fd);
        }}
        className="space-y-3"
      >
        <input
          name="signatureName"
          required
          minLength={2}
          placeholder={labels.namePlaceholder}
          className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
        />
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">
            {labels.signaturePrompt}
          </div>
          <canvas
            ref={canvasRef}
            width={480}
            height={150}
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerLeave={end}
            className="w-full max-w-full h-[150px] rounded-md border border-input bg-white touch-none"
            style={{ touchAction: "none" }}
          />
          <div className="text-right">
            <button
              type="button"
              onClick={clear}
              className="text-xs text-muted-foreground hover:underline"
            >
              {labels.clearSig}
            </button>
          </div>
        </div>
        {!state.ok && state.error && (
          <div className="text-sm text-red-500">{labels.error}</div>
        )}
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={async () => {
              if (!confirm(labels.confirmDecline)) return;
              await declineQuotePortalAction(locale, projectId, quoteId);
              location.reload();
            }}
            className="text-sm px-3 py-1.5 rounded border border-border text-red-500"
          >
            {labels.decline}
          </button>
          <button
            type="submit"
            disabled={pending}
            className="text-sm px-4 py-2 rounded bg-emerald-600 text-white font-medium disabled:opacity-60"
          >
            {pending ? "…" : `${labels.accept} ${quoteNumber}`}
          </button>
        </div>
      </form>
    </div>
  );
}
