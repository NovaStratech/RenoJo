"use client";

import { useMemo, useState, useTransition } from "react";
import { createQuoteDraft, updateQuoteDraft } from "./actions";
import { aiSuggestQuoteLines } from "../ai-actions";
import { AIReviseButton } from "../../../../_components/ai-revise-button";
import { computeQuoteTotals, type LineInput } from "@/lib/quotes/totals";

export type CatalogItemLite = {
  id: string;
  name: string;
  unit: string;
  unitPrice: string;
  defaultQuantity: string;
  taxable: boolean;
};

type Line = LineInput & { key: string };

type Labels = {
  catalogPick: string;
  addLine: string;
  aiPrefill: string;
  aiPrefilling: string;
  aiError: string;
  description: string;
  qty: string;
  unit: string;
  price: string;
  taxable: string;
  remove: string;
  subtotal: string;
  gst: string;
  qst: string;
  total: string;
  notes: string;
  terms: string;
  validUntil: string;
  saveDraft: string;
  updateDraft: string;
  cancel: string;
};

let _k = 0;
const newKey = () => `l_${++_k}_${Math.random().toString(36).slice(2, 6)}`;

export default function QuoteEditor({
  locale,
  projectId,
  quoteId,
  initialLines,
  initialNotes,
  initialTerms,
  initialValidUntil,
  catalog,
  rates,
  currency,
  labels,
  backHref,
}: {
  locale: string;
  projectId: string;
  quoteId?: string;
  initialLines?: LineInput[];
  initialNotes?: string;
  initialTerms?: string;
  initialValidUntil?: string;
  catalog: CatalogItemLite[];
  rates: { gstRate: number; qstRate: number };
  currency: string;
  labels: Labels;
  backHref: string;
}) {
  const [lines, setLines] = useState<Line[]>(
    () =>
      initialLines?.map((l) => ({ ...l, key: newKey() })) ?? [
        {
          key: newKey(),
          description: "",
          quantity: 1,
          unit: "unit",
          unitPrice: 0,
          taxable: true,
        },
      ],
  );
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [terms, setTerms] = useState(initialTerms ?? "");
  const [validUntil, setValidUntil] = useState(initialValidUntil ?? "");
  const [pending, startTransition] = useTransition();
  const [aiPending, startAi] = useTransition();
  const [aiError, setAiError] = useState<string | null>(null);

  const totals = useMemo(
    () => computeQuoteTotals(lines, rates),
    [lines, rates],
  );

  function updateLine(key: string, patch: Partial<Line>) {
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, ...patch } : l)),
    );
  }

  function addEmptyLine() {
    setLines((p) => [
      ...p,
      {
        key: newKey(),
        description: "",
        quantity: 1,
        unit: "unit",
        unitPrice: 0,
        taxable: true,
      },
    ]);
  }

  function addCatalogItem(id: string) {
    if (!id) return;
    const item = catalog.find((c) => c.id === id);
    if (!item) return;
    setLines((p) => [
      ...p,
      {
        key: newKey(),
        description: item.name,
        quantity: Number(item.defaultQuantity) || 1,
        unit: item.unit,
        unitPrice: Number(item.unitPrice) || 0,
        taxable: item.taxable,
      },
    ]);
  }

  function removeLine(key: string) {
    setLines((p) => (p.length > 1 ? p.filter((l) => l.key !== key) : p));
  }

  function submit() {
    const fd = new FormData();
    fd.set("projectId", projectId);
    fd.set("notes", notes);
    fd.set("terms", terms);
    fd.set("validUntil", validUntil);
    fd.set(
      "lines",
      JSON.stringify(
        lines.map(({ key: _k, ...rest }) => rest), // strip key
      ),
    );
    startTransition(async () => {
      if (quoteId) {
        await updateQuoteDraft(locale, quoteId, fd);
      } else {
        await createQuoteDraft(locale, fd);
      }
    });
  }

  const fmt = (n: number) => `${n.toFixed(2)} ${currency}`;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-2 py-2 w-[44%]">{labels.description}</th>
              <th className="px-2 py-2 w-[10%]">{labels.qty}</th>
              <th className="px-2 py-2 w-[10%]">{labels.unit}</th>
              <th className="px-2 py-2 w-[14%]">{labels.price}</th>
              <th className="px-2 py-2 w-[10%]">{labels.taxable}</th>
              <th className="px-2 py-2 w-[12%] text-right">{labels.total}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.key} className="border-t border-border align-top">
                <td className="px-2 py-2">
                  <textarea
                    value={l.description}
                    onChange={(e) =>
                      updateLine(l.key, { description: e.target.value })
                    }
                    rows={2}
                    className="w-full px-2 py-1.5 rounded border border-input bg-background text-sm"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={l.quantity}
                    onChange={(e) =>
                      updateLine(l.key, { quantity: Number(e.target.value) })
                    }
                    className="w-full px-2 py-1.5 rounded border border-input bg-background text-sm text-right"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    value={l.unit}
                    onChange={(e) => updateLine(l.key, { unit: e.target.value })}
                    className="w-full px-2 py-1.5 rounded border border-input bg-background text-sm"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={l.unitPrice}
                    onChange={(e) =>
                      updateLine(l.key, { unitPrice: Number(e.target.value) })
                    }
                    className="w-full px-2 py-1.5 rounded border border-input bg-background text-sm text-right"
                  />
                </td>
                <td className="px-2 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={l.taxable}
                    onChange={(e) =>
                      updateLine(l.key, { taxable: e.target.checked })
                    }
                  />
                </td>
                <td className="px-2 py-2 text-right">
                  {fmt(l.quantity * l.unitPrice)}
                </td>
                <td className="px-2 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => removeLine(l.key)}
                    className="text-xs text-red-700 hover:underline"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex flex-wrap items-center gap-3 px-3 py-3 border-t border-border bg-muted/30">
          <select
            onChange={(e) => {
              addCatalogItem(e.target.value);
              e.currentTarget.value = "";
            }}
            defaultValue=""
            className="text-sm px-2 py-1.5 rounded border border-input bg-background"
          >
            <option value="" disabled>
              {labels.catalogPick}
            </option>
            {catalog.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.unitPrice} {currency}/{c.unit})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={addEmptyLine}
            className="text-sm px-3 py-1.5 rounded border border-border hover:bg-accent"
          >
            + {labels.addLine}
          </button>
          <button
            type="button"
            disabled={aiPending}
            onClick={() => {
              setAiError(null);
              startAi(async () => {
                const r = await aiSuggestQuoteLines(locale, projectId);
                if (r.ok) {
                  setLines((prev) => [
                    ...prev.filter(
                      (l) =>
                        l.description.trim() ||
                        l.quantity !== 1 ||
                        l.unitPrice !== 0,
                    ),
                    ...r.data.map((l) => ({ ...l, key: newKey() })),
                  ]);
                } else {
                  setAiError(
                    r.error === "openai_not_configured"
                      ? labels.aiError
                      : labels.aiError,
                  );
                }
              });
            }}
            className="text-sm px-3 py-1.5 rounded border border-border hover:bg-accent disabled:opacity-60"
          >
            {aiPending ? labels.aiPrefilling : `✨ ${labels.aiPrefill}`}
          </button>
          {aiError && (
            <span className="text-xs text-red-700">{aiError}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <label className="block text-xs font-medium text-muted-foreground">
                {labels.notes}
              </label>
              <AIReviseButton locale={locale} text={notes} kind="notes" onAccept={setNotes} />
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <label className="block text-xs font-medium text-muted-foreground">
                {labels.terms}
              </label>
              <AIReviseButton locale={locale} text={terms} kind="terms" onAccept={setTerms} />
            </div>
            <textarea
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
            />
          </div>
          <label className="block text-xs font-medium text-muted-foreground">
            {labels.validUntil}
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="mt-1 px-3 py-2 rounded-md border border-input bg-background text-sm"
            />
          </label>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 text-sm space-y-2">
          <Row label={labels.subtotal} value={fmt(totals.subtotal)} />
          <Row label={`${labels.gst} (${(rates.gstRate * 100).toFixed(3)}%)`} value={fmt(totals.gst)} />
          <Row label={`${labels.qst} (${(rates.qstRate * 100).toFixed(3)}%)`} value={fmt(totals.qst)} />
          <div className="border-t border-border pt-2 flex items-center justify-between font-bold">
            <span>{labels.total}</span>
            <span>{fmt(totals.total)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <a
          href={backHref}
          className="text-sm px-3 py-1.5 rounded border border-border"
        >
          {labels.cancel}
        </a>
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="text-sm px-4 py-2 rounded bg-primary text-primary-foreground font-medium disabled:opacity-60"
        >
          {pending ? "…" : quoteId ? labels.updateDraft : labels.saveDraft}
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
